// ============== src/lib.rs ==============
pub mod errors;
pub mod grammar;
pub mod inputs;
pub mod instruction;
pub mod parser;
pub mod tree;

// Re-export key types
pub use errors::{CompileError, CompileErrorKind, ParseError, ParseErrorKind, ParseResult};
pub use grammar::{GrammarBuilder, GrammarConfig, GrammarInfo, Rule};
pub use inputs::{InputOffset, InputStream};
pub use instruction::{Instruction, RuleId, TagId};
pub use parser::{CustomParser, ParserState}; // ParserState will be defined in parser.rs
pub use tree::{GreenData, GreenNode, NodePool};
