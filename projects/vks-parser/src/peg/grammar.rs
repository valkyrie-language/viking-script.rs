//! 语法构建器模块
//!
//! 提供语法构建器的实现，支持定义规则、变量和自定义解析函数。

use std::collections::HashMap;
use std::rc::Rc;
use std::cell::RefCell;
use fancy_regex::Regex;

use crate::peg::instruction::{Rule, Instruction, RuleId, TagId};
use crate::peg::parser::ParserState;
use crate::peg::ast::Node;
use crate::inputs::InputOffset;
use crate::errors::Result;
use crate::CustomParser;

/// 语法配置
#[derive(Debug, Clone)]
pub struct GrammarConfig {
    /// 全局变量
    pub variables: HashMap<String, String>,
    /// 制表符等价空格数
    pub tab_as_space: u32,
    /// 是否启用缩进文法
    pub enable_indent: bool,
}

impl Default for GrammarConfig {
    fn default() -> Self {
        Self {
            variables: HashMap::new(),
            tab_as_space: 4,
            enable_indent: false,
        }
    }
}

/// 语法信息
#[derive(Debug, Clone)]
pub struct GrammarInfo {
    /// 语法配置
    pub config: GrammarConfig,
    /// 语法名称
    pub name: String,
    /// 语法ID
    pub id: u32,
    /// 入口规则名称
    pub entry_rule: String,
}

impl GrammarInfo {
    /// 创建一个新的语法信息
    pub fn new(name: impl Into<String>, id: u32, entry_rule: impl Into<String>) -> Self {
        Self {
            config: GrammarConfig::default(),
            name: name.into(),
            id,
            entry_rule: entry_rule.into(),
        }
    }
}

/// 规则定义
#[derive(Debug, Clone)]
struct RuleDefinition {
    /// 规则名称
    name: String,
    /// 规则ID
    id: RuleId,
    /// 规则内容
    rule: Rule,
    /// 是否为记忆化规则
    memoize: bool,
    /// 是否为固定规则（一旦匹配成功，不再尝试其他分支）
    pin: bool,
}

/// 标签定义
#[derive(Debug, Clone)]
struct TagDefinition {
    /// 标签名称
    name: String,
    /// 标签ID
    id: TagId,
}

/// 自定义解析器定义
#[derive(Clone)]
struct CustomParserDefinition {
    /// 解析器名称
    name: String,
    /// 解析器ID
    id: RuleId,
    /// 解析器函数
    parser: CustomParser,
}

impl std::fmt::Debug for CustomParserDefinition {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("CustomParserDefinition")
            .field("name", &self.name)
            .field("id", &self.id)
            .field("parser", &"<function>")
            .finish()
    }
}

/// Pratt解析器操作符定义
#[derive(Debug, Clone)]
struct PrattOperator {
    /// 操作符规则
    rule: Rule,
    /// 绑定力
    binding_power: u32,
    /// 结合性
    associativity: Associativity,
}

/// 操作符结合性
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Associativity {
    /// 左结合
    Left,
    /// 右结合
    Right,
    /// 无结合性
    None,
}

/// 语法构建器
pub struct GrammarBuilder {
    /// 语法信息
    info: GrammarInfo,
    /// 规则定义列表
    rules: Vec<RuleDefinition>,
    /// 标签定义列表
    tags: Vec<TagDefinition>,
    /// 自定义解析器列表
    custom_parsers: Vec<CustomParserDefinition>,
    /// Pratt解析器规则
    pratt_rules: HashMap<String, Vec<PrattOperator>>,
    /// 规则名称到ID的映射
    rule_map: HashMap<String, RuleId>,
    /// 标签名称到ID的映射
    tag_map: HashMap<String, TagId>,
    /// 自定义解析器名称到ID的映射
    custom_map: HashMap<String, RuleId>,
    /// 下一个规则ID
    next_rule_id: RuleId,
    /// 下一个标签ID
    next_tag_id: TagId,
    /// 编译后的指令
    compiled: RefCell<HashMap<RuleId, Instruction>>,
}

impl GrammarBuilder {
    /// 创建一个新的语法构建器
    pub fn new(name: impl Into<String>, id: u32, entry_rule: impl Into<String>) -> Self {
        Self {
            info: GrammarInfo::new(name, id, entry_rule),
            rules: Vec::new(),
            tags: Vec::new(),
            custom_parsers: Vec::new(),
            pratt_rules: HashMap::new(),
            rule_map: HashMap::new(),
            tag_map: HashMap::new(),
            custom_map: HashMap::new(),
            next_rule_id: 1, // 0 保留给入口规则
            next_tag_id: 1,  // 0 保留给无标签
            compiled: RefCell::new(HashMap::new()),
        }
    }

    /// 设置语法配置
    pub fn with_config(mut self, config: GrammarConfig) -> Self {
        self.info.config = config;
        self
    }

    /// 添加全局变量
    pub fn add_variable(&mut self, name: impl Into<String>, value: impl Into<String>) -> &mut Self {
        self.info.config.variables.insert(name.into(), value.into());
        self
    }

    /// 设置制表符等价空格数
    pub fn set_tab_as_space(&mut self, spaces: u32) -> &mut Self {
        self.info.config.tab_as_space = spaces;
        self
    }

    /// 启用缩进文法
    pub fn enable_indent(&mut self, enable: bool) -> &mut Self {
        self.info.config.enable_indent = enable;
        self
    }

    /// 添加规则
    pub fn add_rule(&mut self, name: impl Into<String>, rule: Rule) -> &mut Self {
        let name = name.into();
        let id = self.next_rule_id;
        self.next_rule_id += 1;

        self.rule_map.insert(name.clone(), id);
        self.rules.push(RuleDefinition {
            name,
            id,
            rule,
            memoize: false,
            pin: false,
        });

        self
    }

    /// 添加记忆化规则
    pub fn add_memoized_rule(&mut self, name: impl Into<String>, rule: Rule) -> &mut Self {
        let name = name.into();
        let id = self.next_rule_id;
        self.next_rule_id += 1;

        self.rule_map.insert(name.clone(), id);
        self.rules.push(RuleDefinition {
            name,
            id,
            rule,
            memoize: true,
            pin: false,
        });

        self
    }

    /// 添加固定规则
    pub fn add_pinned_rule(&mut self, name: impl Into<String>, rule: Rule) -> &mut Self {
        let name = name.into();
        let id = self.next_rule_id;
        self.next_rule_id += 1;

        self.rule_map.insert(name.clone(), id);
        self.rules.push(RuleDefinition {
            name,
            id,
            rule,
            memoize: false,
            pin: true,
        });

        self
    }

    /// 添加标签
    pub fn add_tag(&mut self, name: impl Into<String>) -> TagId {
        let name = name.into();
        if let Some(&id) = self.tag_map.get(&name) {
            return id;
        }

        let id = self.next_tag_id;
        self.next_tag_id += 1;

        self.tag_map.insert(name.clone(), id);
        self.tags.push(TagDefinition { name, id });

        id
    }

    /// 添加自定义解析函数
    pub fn add_custom_rule(&mut self, name: impl Into<String>, parser: CustomParser) -> &mut Self {
        let name = name.into();
        let id = self.next_rule_id;
        self.next_rule_id += 1;

        self.custom_map.insert(name.clone(), id);
        self.custom_parsers.push(CustomParserDefinition {
            name,
            id,
            parser,
        });

        self
    }

    /// 添加Pratt解析器规则
    pub fn add_pratt_rule(
        &mut self,
        name: impl Into<String>,
        atom_rule: Rule,
        operators: Vec<(Rule, u32, Associativity)>,
    ) -> &mut Self {
        let name = name.into();
        
        // 添加原子规则
        self.add_rule(format!("{}_atom", name), atom_rule);
        
        // 添加操作符规则
        let pratt_operators = operators
            .into_iter()
            .map(|(rule, binding_power, associativity)| PrattOperator {
                rule,
                binding_power,
                associativity,
            })
            .collect();
        
        self.pratt_rules.insert(name.clone(), pratt_operators);
        
        // 添加表达式规则（将在编译时展开）
        self.add_rule(name, Rule::rule("pratt_expression"));
        
        self
    }

    /// 编译规则
    fn compile_rule(&self, rule: &Rule) -> Result<Instruction> {
        match rule {
            Rule::Rule { name } => {
                if let Some(&id) = self.rule_map.get(name) {
                    Ok(Instruction::Rule { id })
                } else {
                    Err(crate::errors::ParseError::with_kind(
                        format!("未知规则: {}", name),
                        0,
                        crate::errors::ErrorKind::UnknownRule,
                    ))
                }
            },
            Rule::Literal { text } => Ok(Instruction::Literal {
                text: text.clone(),
            }),
            Rule::Regex { regex } => {
                let compiled_regex = Regex::new(regex)
                    .map_err(|e| crate::errors::ParseError::new(format!("无效的正则表达式: {}", e), 0))?;
                Ok(Instruction::Regex { regex: compiled_regex })
            },
            Rule::Sequence { rules } => {
                let compiled_rules = rules
                    .iter()
                    .map(|r| self.compile_rule(r))
                    .collect::<Result<Vec<_>>>()?;
                Ok(Instruction::Sequence { rules: compiled_rules })
            },
            Rule::Choice { rules } => {
                let compiled_rules = rules
                    .iter()
                    .map(|r| self.compile_rule(r))
                    .collect::<Result<Vec<_>>>()?;
                Ok(Instruction::Choice { rules: compiled_rules })
            },
            Rule::Repeats { rule, min, max } => {
                let compiled_rule = self.compile_rule(rule)?;
                Ok(Instruction::Repeats {
                    rule: Box::new(compiled_rule),
                    min: *min,
                    max: *max,
                })
            },
            Rule::Lookahead { rule, negative } => {
                let compiled_rule = self.compile_rule(rule)?;
                Ok(Instruction::Lookahead {
                    rule: Box::new(compiled_rule),
                    negative: *negative,
                })
            },
            Rule::Tagged { id, rule } => {
                let tag_id = self.add_tag(id);
                let compiled_rule = self.compile_rule(rule)?;
                Ok(Instruction::Tagged {
                    id: tag_id,
                    rule: Box::new(compiled_rule),
                })
            },
            Rule::Trap { id, rule } => {
                let trap_id = self.add_tag(id);
                let compiled_rule = self.compile_rule(rule)?;
                Ok(Instruction::Trap {
                    id: trap_id,
                    rule: Box::new(compiled_rule),
                })
            },
            Rule::Variable { name } => Ok(Instruction::Variable {
                name: name.clone(),
            }),
            Rule::Whitespace => Ok(Instruction::Whitespace),
            Rule::Newline => Ok(Instruction::Newline),
            Rule::Ignored => Ok(Instruction::Ignored),
            Rule::Indent => Ok(Instruction::Indent),
            Rule::Dedent => Ok(Instruction::Dedent),
            Rule::EndOfFile => Ok(Instruction::EndOfFile),
            Rule::External { name } => {
                if let Some(&id) = self.custom_map.get(name) {
                    Ok(Instruction::External { custom: id })
                } else {
                    Err(crate::errors::ParseError::with_kind(
                        format!("未知自定义解析器: {}", name),
                        0,
                        crate::errors::ErrorKind::UnknownRule,
                    ))
                }
            },
        }
    }

    /// 编译Pratt解析器规则
    fn compile_pratt_rule(&self, name: &str) -> Result<Instruction> {
        let atom_rule_name = format!("{}_atom", name);
        let atom_rule_id = self.rule_map.get(&atom_rule_name)
            .ok_or_else(|| crate::errors::ParseError::new(format!("未找到Pratt解析器原子规则: {}", atom_rule_name), 0))?;
        
        // 这里只是创建一个引用指令，实际的Pratt解析逻辑在运行时处理
        Ok(Instruction::Rule { id: *atom_rule_id })
    }

    /// 编译所有规则
    fn compile_all_rules(&self) -> Result<HashMap<RuleId, Instruction>> {
        let mut compiled = HashMap::new();
        
        // 编译普通规则
        for rule_def in &self.rules {
            let instruction = self.compile_rule(&rule_def.rule)?;
            compiled.insert(rule_def.id, instruction);
        }
        
        // 编译Pratt解析器规则
        for (name, _) in &self.pratt_rules {
            if let Some(&id) = self.rule_map.get(name) {
                let instruction = self.compile_pratt_rule(name)?;
                compiled.insert(id, instruction);
            }
        }
        
        Ok(compiled)
    }

    /// 构建语法
    pub fn build(&self) -> Result<Grammar> {
        let compiled = self.compile_all_rules()?;
        
        // 获取入口规则ID
        let entry_rule_id = *self.rule_map.get(&self.info.entry_rule)
            .ok_or_else(|| crate::errors::ParseError::new(format!("未找到入口规则: {}", self.info.entry_rule), 0))?;
        
        Ok(Grammar {
            info: self.info.clone(),
            rules: self.rules.clone(),
            tags: self.tags.clone(),
            custom_parsers: self.custom_parsers.clone(),
            pratt_rules: self.pratt_rules.clone(),
            rule_map: self.rule_map.clone(),
            tag_map: self.tag_map.clone(),
            custom_map: self.custom_map.clone(),
            entry_rule_id,
            compiled,
        })
    }
}

/// 编译后的语法
#[derive(Clone)]
pub struct Grammar {
    /// 语法信息
    pub info: GrammarInfo,
    /// 规则定义列表
    rules: Vec<RuleDefinition>,
    /// 标签定义列表
    tags: Vec<TagDefinition>,
    /// 自定义解析器列表
    custom_parsers: Vec<CustomParserDefinition>,
    /// Pratt解析器规则
    pratt_rules: HashMap<String, Vec<PrattOperator>>,
    /// 规则名称到ID的映射
    rule_map: HashMap<String, RuleId>,
    /// 标签名称到ID的映射
    tag_map: HashMap<String, TagId>,
    /// 自定义解析器名称到ID的映射
    custom_map: HashMap<String, RuleId>,
    /// 入口规则ID
    entry_rule_id: RuleId,
    /// 编译后的指令
    compiled: HashMap<RuleId, Instruction>,
}

impl Grammar {
    /// 获取入口规则ID
    pub fn entry_rule_id(&self) -> RuleId {
        self.entry_rule_id
    }
    
    /// 获取规则指令
    pub fn get_instruction(&self, rule_id: RuleId) -> Option<&Instruction> {
        self.compiled.get(&rule_id)
    }
    
    /// 获取规则定义
    pub fn get_rule_def(&self, rule_id: RuleId) -> Option<&RuleDefinition> {
        self.rules.iter().find(|r| r.id == rule_id)
    }
    
    /// 获取规则ID
    pub fn get_rule_id(&self, name: &str) -> Option<RuleId> {
        self.rule_map.get(name).copied()
    }
    
    /// 获取标签ID
    pub fn get_tag_id(&self, name: &str) -> Option<TagId> {
        self.tag_map.get(name).copied()
    }
    
    /// 获取自定义解析器
    pub fn get_custom_parser(&self, custom_id: RuleId) -> Option<&CustomParser> {
        self.custom_parsers.iter()
            .find(|c| c.id == custom_id)
            .map(|c| &c.parser)
    }
    
    /// 检查规则是否为记忆化规则
    pub fn is_memoized(&self, rule_id: RuleId) -> bool {
        self.get_rule_def(rule_id).map(|r| r.memoize).unwrap_or(false)
    }
    
    /// 检查规则是否为固定规则
    pub fn is_pinned(&self, rule_id: RuleId) -> bool {
        self.get_rule_def(rule_id).map(|r| r.pin).unwrap_or(false)
    }
    
    /// 获取Pratt解析器规则
    pub fn get_pratt_operators(&self, name: &str) -> Option<&Vec<PrattOperator>> {
        self.pratt_rules.get(name)
    }
}

impl std::fmt::Debug for Grammar {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Grammar")
            .field("info", &self.info)
            .field("rules", &self.rules)
            .field("tags", &self.tags)
            .field("entry_rule_id", &self.entry_rule_id)
            .finish()
    }
}