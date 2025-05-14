//! 增量式PEG解析库
//!
//! 提供高性能、可扩展的PEG解析器实现，支持记忆化、缩进文法、自定义解析函数等特性。
//! 
pub mod errors;
pub mod peg;

/// 重导出常用类型和函数
pub use crate::peg::grammar::{GrammarBuilder, GrammarConfig, GrammarInfo};
pub use crate::peg::input::{InputStream, InputOffset, StringInputStream, EscapedInputStream};
pub use crate::peg::instruction::{Instruction, Rule, RuleId, TagId};
pub use crate::peg::parser::{Parser, ParserState, BasicParser};
pub use crate::peg::ast::{Node, NodePool, GreenNode, GreenData};
pub use crate::errors::{ParseError, Result, ErrorHandler, DefaultErrorHandler, RecoveryStrategy, TrapRule};

/// 自定义解析函数类型
pub type CustomParser = Box<dyn Fn(&mut ParserState, InputOffset) -> Result<Option<InputOffset>>>;

/// 解析结果类型
pub type ParseResult<T> = Result<Option<T>>;