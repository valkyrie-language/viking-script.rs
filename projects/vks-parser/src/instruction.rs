use fancy_regex::Regex as FancyRegex;
use serde::{Deserialize, Serialize};

pub type RuleId = u32;
pub type TagId = u32; // 0 can mean "no tag"

/// Compiled Rule Definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Instruction {
    /// Reference to another rule by ID
    Rule { id: RuleId },
    /// Reference the external custom parser by ID (maps to a registered custom function)
    External { custom_id: RuleId }, // Using RuleId for simplicity, could be a separate CustomId
    /// Literal string to match
    Literal { text: String },
    /// Reference to a regex rule by ID
    #[serde(with = "serde_fancy_ergex")]
    Regex { regex: fancy_regex::Regex },
    /// Read global variable from config
    Variable { name: String },
    /// Sequence of parts, all must match in order
    Sequence { rules: Vec<Instruction> },
    /// Choice of parts, first one that matches is chosen
    Choice { rules: Vec<Instruction> },
    /// Repetition of a part
    Repeats {
        rule: Box<Instruction>,
        min: u32,
        max: u32,
    }, // max=0 means unbounded (effectively u32::MAX)
    /// Lookahead assertion
    Lookahead {
        rule: Box<Instruction>,
        negative: bool,
    },
    /// Assigns a tag to the resulting node if this part matches
    Tagged { id: TagId, rule: Box<Instruction> },
    /// If `rule` fails, record an error associated with `id` and potentially recover.
    Trap { id: RuleId, rule: Box<Instruction> }, // `id` could be an error code or message key
    /// A special rule that matches whitespace (user overrideable `WHITE_SPACE`)
    Whitespace,
    /// A special rule that matches newline (user overrideable `NEW_LINE`)
    Newline,
    /// A special rule that matches whitespace + newline + comments (user overrideable `IGNORED`)
    Ignored,
    /// A special rule for visual indentation
    Indent,
    /// A special rule for visual dedentation
    Dedent,
    /// A special rule matching end of file
    EndOfFile,
    /// Placeholder for Pratt expressions. The RuleId points to a Pratt configuration.
    PrattExpression { rule_id: RuleId },
    /// A pinned rule. If it matches, no backtracking for the current Choice.
    Pinned { rule: Box<Instruction> },
}