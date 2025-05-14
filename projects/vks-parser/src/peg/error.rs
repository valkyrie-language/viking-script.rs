//! 错误处理模块
//!
//! 定义解析过程中可能出现的各种错误类型和处理机制。

use std::fmt;
use std::error::Error;

/// PEG解析错误
#[derive(Debug)]
pub struct ParseError {
    /// 错误信息
    pub message: String,
    /// 错误位置
    pub position: usize,
    /// 期望的标记
    pub expected: Option<String>,
}

impl ParseError {
    /// 创建一个新的解析错误
    pub fn new(message: impl Into<String>, position: usize) -> Self {
        Self {
            message: message.into(),
            position,
            expected: None,
        }
    }
    
    /// 设置期望的标记
    pub fn with_expected(mut self, expected: impl Into<String>) -> Self {
        self.expected = Some(expected.into());
        self
    }
}

impl fmt::Display for ParseError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "解析错误 (位置 {}): {}", self.position, self.message)?;
        if let Some(expected) = &self.expected {
            write!(f, ", 期望: {}", expected)?;
        }
        Ok(())
    }
}

impl Error for ParseError {}

/// 解析结果类型
pub type Result<T> = std::result::Result<T, ParseError>;

/// 错误恢复策略
pub enum RecoveryStrategy {
    /// 跳过当前标记并继续
    SkipToken,
    /// 插入缺失的标记并继续
    InsertToken(String),
    /// 删除多余的标记并继续
    DeleteToken,
    /// 替换标记并继续
    ReplaceToken(String),
    /// 放弃当前规则，尝试下一个选择
    Backtrack,
    /// 终止解析
    Abort,
}

/// 错误处理器
pub trait ErrorHandler {
    /// 处理解析错误
    fn handle_error(&mut self, error: &ParseError) -> RecoveryStrategy;
    
    /// 记录错误
    fn record_error(&mut self, error: ParseError);
    
    /// 获取所有记录的错误
    fn get_errors(&self) -> &[ParseError];
}

/// 默认错误处理器
pub struct DefaultErrorHandler {
    /// 记录的错误列表
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
    fn handle_error(&mut self, error: &ParseError) -> RecoveryStrategy {
        // 默认策略：记录错误并尝试跳过当前标记
        if self.errors.len() >= self.max_errors {
            RecoveryStrategy::Abort
        } else {
            RecoveryStrategy::SkipToken
        }
    }
    
    fn record_error(&mut self, error: ParseError) {
        self.errors.push(error);
    }
    
    fn get_errors(&self) -> &[ParseError] {
        &self.errors
    }
}

/// Trap规则，用于提前终止解析
pub struct TrapRule {
    /// 条件函数
    pub condition: Box<dyn Fn(usize, char) -> bool>,
    /// 错误消息
    pub message: String,
}

impl TrapRule {
    /// 创建一个新的Trap规则
    pub fn new<F>(condition: F, message: impl Into<String>) -> Self
    where
        F: Fn(usize, char) -> bool + 'static,
    {
        Self {
            condition: Box::new(condition),
            message: message.into(),
        }
    }
    
    /// 检查是否触发Trap
    pub fn check(&self, position: usize, c: char) -> bool {
        (self.condition)(position, c)
    }
}