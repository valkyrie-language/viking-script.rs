// ============== src/lib.rs ==============
pub mod error;
pub mod grammar;
pub mod input;
pub mod instruction;
pub mod parser;
pub mod tree;

// Re-export key types
pub use error::{CompileError, CompileErrorKind, ParseError, ParseErrorKind, ParseResult};
pub use grammar::{GrammarBuilder, GrammarConfig, GrammarInfo, Rule};
pub use input::{InputOffset, InputStream};
pub use instruction::{Instruction, RuleId, TagId};
pub use parser::{CustomParser, ParserState}; // ParserState will be defined in parser.rs
pub use tree::{GreenData, GreenNode, NodePool};
