//! 错误处理模块
//!
//! 提供解析错误类型和错误恢复策略的定义和实现。

use std::fmt;
use std::rc::Rc;

use crate::peg::input::InputOffset;

/// 解析结果类型
pub type Result<T> = std::result::Result<T, ParseError>;

/// 解析错误
#[derive(Debug, Clone)]
pub struct ParseError {
    /// 错误消息
    message: String,
    /// 错误位置
    position: InputOffset,
    /// 错误类型
    kind: ErrorKind,
}

/// 错误类型
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ErrorKind {
    /// 语法错误
    Syntax,
    /// 未知规则
    UnknownRule,
    /// 未完成解析
    Incomplete,
    /// 自定义错误
    Custom(String),
}

impl ParseError {
    /// 创建一个新的解析错误
    pub fn new(message: impl Into<String>, position: InputOffset) -> Self {
        Self {
            message: message.into(),
            position,
            kind: ErrorKind::Syntax,
        }
    }

    /// 创建一个带有错误类型的解析错误
    pub fn with_kind(message: impl Into<String>, position: InputOffset, kind: ErrorKind) -> Self {
        Self {
            message: message.into(),
            position,
            kind,
        }
    }

    /// 获取错误位置
    pub fn position(&self) -> InputOffset {
        self.position
    }

    /// 获取错误消息
    pub fn message(&self) -> &str {
        &self.message
    }

    /// 获取错误类型
    pub fn kind(&self) -> &ErrorKind {
        &self.kind
    }
}

impl fmt::Display for ParseError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "解析错误 @{}: {}", self.position, self.message)
    }
}

impl std::error::Error for ParseError {}

/// 错误恢复策略
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RecoveryStrategy {
    /// 继续解析
    Continue,
    /// 跳过当前标记
    SkipToken,
    /// 回溯到规则开始位置
    Backtrack,
    /// 终止解析
    Abort,
}

/// 错误处理器trait
pub trait ErrorHandler {
    /// 记录错误
    fn record_error(&mut self, error: ParseError);
    
    /// 获取所有错误
    fn get_errors(&self) -> &[ParseError];
    
    /// 处理错误并返回恢复策略
    fn handle_error(&mut self, error: ParseError) -> RecoveryStrategy;
    
    /// 清除所有错误
    fn clear_errors(&mut self);
}

/// 默认错误处理器实现
#[derive(Debug, Clone, Default)]
pub struct DefaultErrorHandler {
    /// 错误列表
    errors: Vec<ParseError>,
    /// 最大错误数量
    max_errors: usize,
}

impl DefaultErrorHandler {
    /// 创建一个新的默认错误处理器
    pub fn new(max_errors: usize) -> Self {
        Self {
            errors: Vec::new(),
            max_errors,
        }
    }
}

impl ErrorHandler for DefaultErrorHandler {
    fn record_error(&mut self, error: ParseError) {
        if self.errors.len() < self.max_errors {
            self.errors.push(error);
        }
    }
    
    fn get_errors(&self) -> &[ParseError] {
        &self.errors
    }
    
    fn handle_error(&mut self, error: ParseError) -> RecoveryStrategy {
        self.record_error(error.clone());
        
        if self.errors.len() >= self.max_errors {
            RecoveryStrategy::Abort
        } else {
            RecoveryStrategy::Continue
        }
    }
    
    fn clear_errors(&mut self) {
        self.errors.clear();
    }
}

/// 陷阱规则，用于提前终止解析并恢复
#[derive(Debug, Clone)]
pub struct TrapRule {
    /// 规则ID
    pub id: usize,
    /// 恢复标记
    pub recovery_token: Option<String>,
}

impl TrapRule {
    /// 创建一个新的陷阱规则
    pub fn new(id: usize, recovery_token: Option<String>) -> Self {
        Self {
            id,
            recovery_token,
        }
    }
}