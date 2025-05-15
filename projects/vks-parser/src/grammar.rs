use crate::parser::CustomParser; // Will be defined in parser.rs
use crate::{
    errors::{CompileError, CompileErrorKind},
    instruction::{Instruction, RuleId, TagId},
};
use fancy_regex::Regex as FancyRegex;
use serde::{Deserialize, Serialize};
use std::{
    collections::{BTreeMap, HashMap, HashSet},
    fmt::{Debug, Formatter},
};
// HashMap for faster lookups during compile

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GrammarConfig {
    pub variables: BTreeMap<String, String>,
    pub tab_as_space: u32,
    // Potentially other global configurations:
    // e.g., default whitespace rule name, default newline rule name
    pub default_whitespace_rule_name: Option<String>,
    pub default_newline_rule_name: Option<String>,
    pub default_ignored_rule_name: Option<String>,
}

impl Default for GrammarConfig {
    fn default() -> Self {
        Self {
            variables: BTreeMap::new(),
            tab_as_space: 4,
            default_whitespace_rule_name: Some("WHITESPACE".to_string()),
            default_newline_rule_name: Some("NEWLINE".to_string()),
            default_ignored_rule_name: Some("IGNORED".to_string()),
        }
    }
}

/// Represents a part of a rule during building.
/// This is the Abstract Syntax Tree (AST) for grammar definitions.
#[derive(Debug, Clone, Eq, PartialEq)] // Not typically serialized itself, only the compiled Instructions
pub enum Rule {
    /// Reference to another rule by name
    RuleRef {
        name: String,
    },
    /// Literal string to match, e.g., "+", "keyword"
    Literal {
        text: String,
    },
    /// Regex string to match
    Regex {
        regex_str: String,
    }, // Store as string, compile later
    /// Sequence of parts, all must match in order
    Sequence {
        rules: Vec<Rule>,
    },
    /// Choice of parts, first one that matches is chosen
    Choice {
        rules: Vec<Rule>,
    },
    /// Repetition of a part
    Repeats {
        rule: Box<Rule>,
        min: u32,
        max: u32, // 0 for unbounded
    },
    /// Lookahead assertion
    Lookahead {
        rule: Box<Rule>,
        negative: bool,
    },
    /// Assigns a named tag to the resulting node if this part matches
    Tagged {
        name: String,
        rule: Box<Rule>,
    },
    /// Read global variable from config (resolved to its value as a Literal or special instruction)
    Variable {
        name: String,
    },
    /// A special rule that matches whitespace (user overrideable)
    Whitespace,
    /// A special rule that matches newline (user overrideable)
    Newline,
    /// A special rule that matches combined ignored tokens (user overrideable)
    Ignored,
    /// A special rule for visual indentation
    Indent,
    /// A special rule for visual dedentation
    Dedent,
    /// A special rule matching end of file
    EndOfFile,
    /// A pinned rule. If it matches, no backtracking for the current Choice.
    Pinned {
        rule: Box<Rule>,
    },
    /// Trap errors from this rule.
    Trap {
        error_key: String,
        rule: Box<Rule>,
    }, // error_key could map to specific errors data
    // External custom rule reference by name
    ExternalRef {
        name: String,
    },
    // Placeholder for Pratt definition; actual definition via add_pratt_rule
    PrattRulePlaceholder {
        name: String,
    },
}

// Information about a Pratt-style expression rule
#[derive(Debug, Clone)]
pub struct PrattRuleConfig {
    pub name: String,
    pub primary_expression_rule_name: String,
    pub operators: Vec<PrattOperator>,
    // RuleId assigned during compilation
    pub self_rule_id: Option<RuleId>,
    pub primary_rule_id: Option<RuleId>,
}

#[derive(Debug, Clone, Eq, PartialEq)]
pub enum OperatorType {
    Infix,
    Prefix,
    Postfix,
}

#[derive(Debug, Clone, Eq, PartialEq)]
pub struct PrattOperator {
    pub op_type: OperatorType,
    pub rule: Rule, // The rule that matches the operator token(s)
    pub precedence: u8,
    pub associativity: Option<Associativity>, // None for prefix/postfix or non-assoc infix
    // Compiled RuleId for the operator's rule
    pub op_rule_id: Option<RuleId>,
    // Optional tag for the operator itself or parts of it (e.g. lhs, rhs for infix)
    pub tag_name: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Associativity {
    Left,
    Right,
}


pub struct GrammarBuilder {
    config: GrammarConfig,
    rule_definitions: BTreeMap<String, Rule>, // Rule ASTs
    custom_parsers_by_name: BTreeMap<String, CustomParser>,
    pratt_rules_config: BTreeMap<String, PrattRuleConfig>, // Name to Pratt config
    next_rule_id: RuleId,
    next_tag_id: TagId,
    next_custom_id: RuleId, // Using RuleId space for custom rules for simplicity

    // For compilation
    rule_name_to_id: HashMap<String, RuleId>,
    tag_name_to_id: HashMap<String, TagId>,
    custom_name_to_id: HashMap<String, RuleId>,
    trap_key_to_id: HashMap<String, RuleId>, // Mapping trap errors keys to RuleIds
}

impl GrammarBuilder {
    pub fn new() -> Self {
        Self {
            config: GrammarConfig::default(),
            rule_definitions: BTreeMap::new(),
            custom_parsers_by_name: BTreeMap::new(),
            pratt_rules_config: BTreeMap::new(),
            next_rule_id: 1,   // 0 might be reserved for invalid/null
            next_tag_id: 1,    // 0 for no-tag
            next_custom_id: 1, // Separate ID space, but reusing RuleId for now
            rule_name_to_id: HashMap::new(),
            tag_name_to_id: HashMap::new(),
            custom_name_to_id: HashMap::new(),
            trap_key_to_id: HashMap::new(),
        }
    }

    pub fn with_config(config: GrammarConfig) -> Self {
        Self { config, ..Self::new() }
    }

    pub fn config_mut(&mut self) -> &mut GrammarConfig {
        &mut self.config
    }

    pub fn add_variable(&mut self, name: String, value: String) -> Result<(), CompileError> {
        if self.config.variables.contains_key(&name) {
            return Err(CompileError {
                kind: CompileErrorKind::DuplicateVariableName(name.clone()),
                message: format!("Variable '{}' already defined.", name),
            });
        }
        self.config.variables.insert(name, value);
        Ok(())
    }

    pub fn add_rule(&mut self, name: String, rule: Rule) -> Result<RuleId, CompileError> {
        if self.rule_definitions.contains_key(&name) || self.pratt_rules_config.contains_key(&name) {
            return Err(CompileError {
                kind: CompileErrorKind::DuplicateRuleName(name.clone()),
                message: format!("Rule '{}' already defined.", name),
            });
        }
        let id = self.assign_rule_id(&name);
        self.rule_definitions.insert(name, rule);
        Ok(id)
    }

    pub fn add_custom_rule(&mut self, name: String, parser: CustomParser) -> Result<RuleId, CompileError> {
        if self.custom_parsers_by_name.contains_key(&name) {
            return Err(CompileError {
                kind: CompileErrorKind::DuplicateCustomRuleName(name.clone()),
                message: format!("Custom rule '{}' already defined.", name),
            });
        }
        let id = self.assign_custom_id(&name);
        self.custom_parsers_by_name.insert(name, parser);
        Ok(id)
    }

    pub fn add_pratt_rule(
        &mut self,
        name: String,
        primary_expression_rule_name: String,
        operators: Vec<PrattOperator>,
    ) -> Result<RuleId, CompileError> {
        if self.rule_definitions.contains_key(&name) || self.pratt_rules_config.contains_key(&name) {
            return Err(CompileError {
                kind: CompileErrorKind::DuplicateRuleName(name.clone()),
                message: format!("Pratt rule '{}' already defined or a regular rule exists with this name.", name),
            });
        }
        // Pratt rule itself gets an ID
        let id = self.assign_rule_id(&name);
        let pratt_config = PrattRuleConfig {
            name: name.clone(),
            primary_expression_rule_name,
            operators,
            self_rule_id: Some(id),
            primary_rule_id: None, // To be resolved during compilation
        };
        self.pratt_rules_config.insert(name, pratt_config);
        Ok(id)
    }

    fn assign_rule_id(&mut self, name: &str) -> RuleId {
        *self.rule_name_to_id.entry(name.to_string()).or_insert_with(|| {
            let id = self.next_rule_id;
            self.next_rule_id += 1;
            id
        })
    }

    fn assign_tag_id(&mut self, name: &str) -> TagId {
        *self.tag_name_to_id.entry(name.to_string()).or_insert_with(|| {
            let id = self.next_tag_id;
            self.next_tag_id += 1;
            id
        })
    }

    fn assign_custom_id(&mut self, name: &str) -> RuleId {
        *self.custom_name_to_id.entry(name.to_string()).or_insert_with(|| {
            let id = self.next_custom_id;
            self.next_custom_id += 1;
            id
        })
    }

    fn assign_trap_id(&mut self, key: &str) -> RuleId {
        *self.trap_key_to_id.entry(key.to_string()).or_insert_with(|| {
            // Using rule_id space for trap IDs for now. Could be separate.
            let id = self.next_rule_id;
            self.next_rule_id += 1;
            id
        })
    }

    fn compile_rule(&mut self, rule_ast: &Rule, defined_rules: &HashSet<String>) -> Result<Instruction, CompileError> {
        match rule_ast {
            Rule::RuleRef { name } => {
                if !defined_rules.contains(name) && !self.pratt_rules_config.contains_key(name) {
                    return Err(CompileError {
                        kind: CompileErrorKind::UndefinedRule(name.clone()),
                        message: format!("Rule '{}' referenced but not defined.", name),
                    });
                }
                let id = self.rule_name_to_id.get(name).cloned().ok_or_else(|| CompileError {
                    kind: CompileErrorKind::UndefinedRule(name.clone()), // Should have been caught by assign_rule_id
                    message: format!("Rule '{}' ID not found after pre-scan.", name),
                })?;
                // Check if it's a Pratt rule, if so, use PrattExpression instruction
                if self.pratt_rules_config.contains_key(name) {
                    Ok(Instruction::PrattExpression { rule_id: id })
                }
                else {
                    Ok(Instruction::Rule { id })
                }
            }
            Rule::Literal { text } => Ok(Instruction::Literal { text: text.clone() }),
            Rule::Regex { regex_str } => FancyRegex::new(regex_str)
                .map(|regex| Instruction::Regex { regex })
                .map_err(|e| CompileError { kind: CompileErrorKind::InvalidRegex(regex_str.clone()), message: e.to_string() }),
            Rule::Sequence { rules } => {
                let compiled_rules =
                    rules.iter().map(|r| self.compile_rule(r, defined_rules)).collect::<Result<Vec<_>, _>>()?;
                Ok(Instruction::Sequence { rules: compiled_rules })
            }
            Rule::Choice { rules } => {
                let compiled_rules =
                    rules.iter().map(|r| self.compile_rule(r, defined_rules)).collect::<Result<Vec<_>, _>>()?;
                Ok(Instruction::Choice { rules: compiled_rules })
            }
            Rule::Repeats { rule, min, max } => {
                let compiled_rule = self.compile_rule(rule, defined_rules)?;
                Ok(Instruction::Repeats {
                    rule: Box::new(compiled_rule),
                    min: *min,
                    max: if *max == 0 { u32::MAX } else { *max },
                })
            }
            Rule::Lookahead { rule, negative } => {
                let compiled_rule = self.compile_rule(rule, defined_rules)?;
                Ok(Instruction::Lookahead { rule: Box::new(compiled_rule), negative: *negative })
            }
            Rule::Tagged { name, rule } => {
                let tag_id = self.assign_tag_id(name);
                let compiled_rule = self.compile_rule(rule, defined_rules)?;
                Ok(Instruction::Tagged { id: tag_id, rule: Box::new(compiled_rule) })
            }
            Rule::Variable { name } => {
                // Variables are substituted at compile time with a literal,
                // or could be a runtime lookup if Instruction::Variable is used.
                // The prompt's Instruction::Variable implies runtime lookup.
                Ok(Instruction::Variable { name: name.clone() })
            }
            Rule::Whitespace => Ok(Instruction::Whitespace),
            Rule::Newline => Ok(Instruction::Newline),
            Rule::Ignored => Ok(Instruction::Ignored),
            Rule::Indent => Ok(Instruction::Indent),
            Rule::Dedent => Ok(Instruction::Dedent),
            Rule::EndOfFile => Ok(Instruction::EndOfFile),
            Rule::Pinned { rule } => {
                let compiled_rule = self.compile_rule(rule, defined_rules)?;
                Ok(Instruction::Pinned { rule: Box::new(compiled_rule) })
            }
            Rule::Trap { error_key, rule } => {
                let trap_id = self.assign_trap_id(error_key);
                let compiled_rule = self.compile_rule(rule, defined_rules)?;
                Ok(Instruction::Trap { id: trap_id, rule: Box::new(compiled_rule) })
            }
            Rule::ExternalRef { name } => {
                let custom_id = self.custom_name_to_id.get(name).cloned().ok_or_else(|| CompileError {
                    kind: CompileErrorKind::UndefinedRule(name.clone()), // Or a specific "UndefinedCustomRule"
                    message: format!("Custom rule '{}' not found.", name),
                })?;
                Ok(Instruction::External { custom_id })
            }
            Rule::PrattRulePlaceholder { name: _ } => {
                // This should not be directly compiled; Pratt rules are handled via their config
                // and result in an Instruction::PrattExpression when referenced.
                Err(CompileError {
                    kind: CompileErrorKind::PrattError("PrattRulePlaceholder should not be compiled directly.".to_string()),
                    message: "Internal errors".to_string(),
                })
            }
        }
    }

    pub fn compile(mut self) -> Result<GrammarInfo, Vec<CompileError>> {
        let mut errors = Vec::new();
        let mut compiled_instructions = BTreeMap::new(); // RuleId -> Instruction

        // Pre-scan to assign IDs to all rule names (regular and Pratt)
        let rules: Vec<_> = self.rule_definitions.keys().cloned().collect();
        for name in rules {
            self.assign_rule_id(&name);
        }
        let pratt_rules: Vec<_> = self.pratt_rules_config.keys().cloned().collect();
        for name in pratt_rules {
            self.assign_rule_id(&name); // Pratt rules also get a main RuleId
        }
        // Pre-scan to assign IDs to custom rule names
        let custom_rules: Vec<_> = self.custom_parsers_by_name.keys().cloned().collect();
        for name in custom_rules {
            self.assign_custom_id(&name);
        }

        let defined_rules: HashSet<String> = self.rule_definitions.keys().cloned().collect();
        let pratt_configs = self.pratt_rules_config.clone(); // Clone to avoid borrow checker issues

        // Compile regular rules
        for (name, rule_ast) in self.rule_definitions.clone() {
            let rule_id = *self.rule_name_to_id.get(&name).unwrap(); // Should exist from pre-scan
            match self.compile_rule(&rule_ast, &defined_rules) {
                Ok(instr) => {
                    compiled_instructions.insert(rule_id, instr);
                }
                Err(e) => errors.push(e),
            }
        }

        // Prepare Pratt rule configurations (resolve referenced rule names to IDs)
        let mut compiled_pratt_configs = BTreeMap::new();
        for (pratt_name, mut pratt_config) in pratt_configs {
            let pratt_rule_id = *self.rule_name_to_id.get(&pratt_name).unwrap();
            pratt_config.self_rule_id = Some(pratt_rule_id);

            match self.rule_name_to_id.get(&pratt_config.primary_expression_rule_name) {
                Some(id) => pratt_config.primary_rule_id = Some(*id),
                None => errors.push(CompileError {
                    kind: CompileErrorKind::UndefinedRule(pratt_config.primary_expression_rule_name.clone()),
                    message: format!(
                        "Primary expression rule '{}' for Pratt rule '{}' not found.",
                        pratt_config.primary_expression_rule_name, pratt_name
                    ),
                }),
            }
            for op in &mut pratt_config.operators {
                // Compile the operator's rule to get its structure/ID if it's a RuleRef
                // For simplicity, let's assume op.rule is often a Literal or simple token rule.
                // A full compile of op.rule might be needed if it's complex.
                // Here we just try to get an ID if it's a direct RuleRef.
                if let Rule::RuleRef { name: op_rule_name } = &op.rule {
                    match self.rule_name_to_id.get(op_rule_name) {
                        Some(id) => op.op_rule_id = Some(*id),
                        None => errors.push(CompileError {
                            kind: CompileErrorKind::UndefinedRule(op_rule_name.clone()),
                            message: format!("Operator rule '{}' for Pratt rule '{}' not found.", op_rule_name, pratt_name),
                        }),
                    }
                }
                // If operator has a tag name, assign an ID
                if let Some(tag_name) = &op.tag_name {
                    self.assign_tag_id(tag_name);
                }
            }
            compiled_pratt_configs.insert(pratt_rule_id, pratt_config);
        }

        if !errors.is_empty() {
            return Err(errors);
        }

        // Build tag_id_to_name map (reverse of tag_name_to_id)
        let mut tag_id_to_name: BTreeMap<TagId, String> = BTreeMap::new();
        for (name, id) in &self.tag_name_to_id {
            tag_id_to_name.insert(*id, name.clone());
        }

        // Build rule_id_to_name map
        let mut rule_id_to_name: BTreeMap<RuleId, String> = BTreeMap::new();
        for (name, id) in &self.rule_name_to_id {
            rule_id_to_name.insert(*id, name.clone());
        }

        Ok(GrammarInfo {
            config: self.config,
            instructions_map: compiled_instructions,
            rule_name_to_id: self.rule_name_to_id,
            rule_id_to_name,
            tag_name_to_id: self.tag_name_to_id,
            tag_id_to_name,
            custom_parsers: self.custom_parsers_by_name,
            custom_name_to_id: self.custom_name_to_id,
            pratt_configs: compiled_pratt_configs,
            // ... other compiled info
        })
    }
}

impl Default for GrammarBuilder {
    fn default() -> Self {
        Self::new()
    }
}

pub struct GrammarInfo {
    pub config: GrammarConfig,
    /// Compiled instructions, mapping RuleId to its main Instruction body
    pub instructions_map: BTreeMap<RuleId, Instruction>,
    pub rule_name_to_id: HashMap<String, RuleId>,  // For quick lookup by name
    pub rule_id_to_name: BTreeMap<RuleId, String>, // For debugging, errors messages
    pub tag_name_to_id: HashMap<String, TagId>,
    pub tag_id_to_name: BTreeMap<TagId, String>,        // For debugging
    pub custom_parsers: BTreeMap<String, CustomParser>, // Name to function
    pub custom_name_to_id: HashMap<String, RuleId>,     // Custom rule name to its ID
    pub pratt_configs: BTreeMap<RuleId, PrattRuleConfig>, /* RuleId of pratt rule to its config
                                                         * Potentially:
                                                         * pub trap_id_to_key: BTreeMap<RuleId, String>,
                                                         * pub start_rule_id: Option<RuleId>, (conventionally the first rule added or a specific one) */
}

impl Clone for GrammarInfo {
    fn clone(&self) -> Self {
        Self {
            config: Default::default(),
            instructions_map: Default::default(),
            rule_name_to_id: Default::default(),
            rule_id_to_name: Default::default(),
            tag_name_to_id: Default::default(),
            tag_id_to_name: Default::default(),
            custom_parsers: Default::default(),
            custom_name_to_id: Default::default(),
            pratt_configs: Default::default(),
        }
    }
}


impl Debug for GrammarInfo {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("GrammarInfo")
            .field("config", &self.config)
            .field("instructions_map", &self.instructions_map)
            .field("rule_name_to_id", &self.rule_name_to_id)
            .field("rule_id_to_name", &self.rule_id_to_name)
            .field("tag_name_to_id", &self.tag_name_to_id)
            .field("tag_id_to_name", &self.tag_id_to_name)
            // .field("custom_parsers", &self.custom_parsers)
            .field("custom_name_to_id", &self.custom_name_to_id)
            .field("pratt_configs", &self.pratt_configs)
            .finish()
    }
}
