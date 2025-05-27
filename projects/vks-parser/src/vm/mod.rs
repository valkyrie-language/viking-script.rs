use serde::{Deserialize, Serialize};
use crate::grammar::GrammarConfig;
use crate::parser::CustomParser;
use crate::tree::NodePool;

pub struct Vm {
    parser_pool: Vec<CustomParser>,
    node_pool: NodePool,
}


pub struct InstructionOffset {
    /// start index of the language in vm
    start_rule: usize,
    /// start index of text
    start_text: usize,
    /// start index of regex
    start_regex: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Instruction {
    /// Reference to another rule start at
    Rule { jump: u32 },
    /// Literal string to match
    Literal { text_id: u32 },
    /// Reference to a regex rule by ID
    Regex { regex_id: u32 },
    /// Read global variable from config
    Variable { text_id: u32 },
    /// Sequence of parts, all must match in order
    /// take next <rules> Instruction
    Sequence { rules: u32 },
    /// take next <rules> Instruction
    Choice { rules: u32 },
    /// Repetition of a part, including optional (0-1), zero-or-more(0-u32::Max), one-or-more(0-u32::Max)
    /// take next Instruction
    Repeats { min: u32, max: u32 },
    /// take next Instruction
    Lookahead { negative: bool },
    /// Assigns a tag to the resulting node if this part matches
    /// take next Instruction
    Tagged { tag_id: u32 },
    /// take next Instruction, eat next next if recover = true
    Trap { recover: bool },
    /// A special rule that matches whitespace (user overrideable `WHITE_SPACE`)
    Whitespace,
    /// A special rule that matches newline (user overrideable `NEW_LINE`)
    Newline,
    /// A special rule that matches whitespace + newline + comments (user overrideable `IGNORED`)
    Ignored,
    /// a special rule for visual indentation
    Indent,
    /// a special rule for visual dedentation
    Dedent,
    /// a special rule matching end of file/stream
    EndOfStream,
}