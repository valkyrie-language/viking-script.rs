//! 解析器核心模块
//!
//! 提供PEG解析器的核心实现，支持自定义规则、记忆化、左递归和缩进文法。

use std::collections::HashMap;
use std::rc::Rc;
use std::cell::RefCell;

use crate::peg::input::InputStream;
use crate::peg::error::{ParseError, Result, ErrorHandler, DefaultErrorHandler, RecoveryStrategy, TrapRule};
use crate::peg::ast::{Node, NodeType, NodePool};
use crate::peg::language::Language;

/// 解析器状态
pub struct ParserState<'a> {
    /// 输入流
    pub input: Box<dyn InputStream + 'a>,
    /// 当前位置
    pub position: usize,
    /// 错误处理器
    pub error_handler: Box<dyn ErrorHandler + 'a>,
    /// 记忆化表
    memo_table: HashMap<(String, usize), Result<Option<Node>>>,
    /// 左递归处理表
    lr_table: HashMap<(String, usize), LREntry>,
    /// AST节点池
    node_pool: NodePool,
    /// 语言定义
    language: Option<Rc<dyn Language>>,
    /// 缩进级别栈
    indent_stack: Vec<usize>,
    /// Trap规则列表
    trap_rules: Vec<TrapRule>,
}

/// 左递归条目
struct LREntry {
    /// 是否正在处理
    in_progress: bool,
    /// 当前结果
    result: Option<Result<Option<Node>>>,
    /// 调用深度
    depth: usize,
}

impl<'a> ParserState<'a> {
    /// 创建一个新的解析器状态
    pub fn new(input: Box<dyn InputStream + 'a>) -> Self {
        Self {
            input,
            position: 0,
            error_handler: Box::new(DefaultErrorHandler::new(10)),
            memo_table: HashMap::new(),
            lr_table: HashMap::new(),
            node_pool: NodePool::new(),
            language: None,
            indent_stack: vec![0],
            trap_rules: Vec::new(),
        }
    }
    
    /// 设置语言定义
    pub fn with_language(mut self, language: Rc<dyn Language>) -> Self {
        self.language = Some(language);
        self
    }
    
    /// 设置错误处理器
    pub fn with_error_handler(mut self, error_handler: Box<dyn ErrorHandler + 'a>) -> Self {
        self.error_handler = error_handler;
        self
    }
    
    /// 添加Trap规则
    pub fn add_trap_rule(&mut self, rule: TrapRule) {
        self.trap_rules.push(rule);
    }
    
    /// 检查是否触发Trap规则
    fn check_trap_rules(&self) -> Option<ParseError> {
        if let Some(c) = self.input.char_at(self.position) {
            for rule in &self.trap_rules {
                if rule.check(self.position, c) {
                    return Some(ParseError::new(&rule.message, self.position));
                }
            }
        }
        None
    }
    
    /// 应用规则
    pub fn apply_rule<F>(&mut self, rule_name: &str, rule_fn: F) -> Result<Option<Node>>
    where
        F: FnOnce(&mut Self) -> Result<Option<Node>>,
    {
        // 检查Trap规则
        if let Some(error) = self.check_trap_rules() {
            self.error_handler.record_error(error.clone());
            return Err(error);
        }
        
        // 检查记忆化表
        let key = (rule_name.to_string(), self.position);
        if let Some(result) = self.memo_table.get(&key) {
            return result.clone();
        }
        
        // 检查左递归
        if let Some(entry) = self.lr_table.get(&key) {
            if entry.in_progress {
                // 正在处理左递归，返回当前结果
                return entry.result.clone().unwrap_or(Ok(None));
            }
        }
        
        // 创建左递归条目
        self.lr_table.insert(key.clone(), LREntry {
            in_progress: true,
            result: None,
            depth: 0,
        });
        
        // 应用规则
        let mut result = rule_fn(self);
        
        // 处理左递归（Packrat解析算法的左递归支持）
        if let Some(entry) = self.lr_table.get(&key) {
            if entry.in_progress {
                // 检测到左递归，进行迭代求解
                let mut depth = 0;
                let start_pos = self.position;
                
                // 迭代求解左递归
                while let Ok(Some(_)) = &result {
                    depth += 1;
                    if depth > 100 { // 防止无限递归
                        break;
                    }
                    
                    // 更新左递归条目
                    self.lr_table.insert(key.clone(), LREntry {
                        in_progress: true,
                        result: Some(result.clone()),
                        depth,
                    });
                    
                    // 重置位置并重新应用规则
                    self.position = start_pos;
                    let new_result = rule_fn(self);
                    
                    // 如果新结果不比旧结果好，则停止迭代
                    if let Ok(Some(new_node)) = &new_result {
                        if let Ok(Some(old_node)) = &result {
                            if new_node.range().end <= old_node.range().end {
                                break;
                            }
                        }
                    } else {
                        break;
                    }
                    
                    result = new_result;
                }
            }
        }
        
        // 更新左递归条目
        if let Some(entry) = self.lr_table.get_mut(&key) {
            entry.in_progress = false;
            entry.result = Some(result.clone());
        }
        
        // 更新记忆化表
        self.memo_table.insert(key, result.clone());
        
        result
    }
    
    /// 创建AST节点
    pub fn create_node(&mut self, node_type: NodeType, start: usize, end: usize) -> Node {
        self.node_pool.create_node(node_type, start, end)
    }
    
    /// 处理错误
    pub fn handle_error(&mut self, error: ParseError) -> RecoveryStrategy {
        self.error_handler.record_error(error.clone());
        self.error_handler.handle_error(&error)
    }
    
    /// 获取当前缩进级别
    pub fn current_indent(&self) -> usize {
        *self.indent_stack.last().unwrap_or(&0)
    }
    
    /// 推入新的缩进级别
    pub fn push_indent(&mut self, indent: usize) {
        self.indent_stack.push(indent);
    }
    
    /// 弹出缩进级别
    pub fn pop_indent(&mut self) -> Option<usize> {
        self.indent_stack.pop()
    }
}

/// 解析器trait
pub trait Parser {
    /// 解析输入流
    fn parse(&mut self, input: &str) -> Result<Node>;
    
    /// 获取解析错误
    fn get_errors(&self) -> Vec<ParseError>;
}

/// 基本解析器实现
pub struct BasicParser<'a> {
    /// 解析器状态
    state: RefCell<ParserState<'a>>,
    /// 语言定义
    language: Rc<dyn Language>,
}

impl<'a> BasicParser<'a> {
    /// 创建一个新的基本解析器
    pub fn new(language: Rc<dyn Language>) -> Self {
        Self {
            state: RefCell::new(ParserState::new(Box::new(crate::peg::input::StringInputStream::new("")))),
            language,
        }
    }
    
    /// 解析入口规则
    fn parse_entry(&self, state: &mut ParserState) -> Result<Option<Node>> {
        // 获取语言定义的入口规则
        if let Some(language) = &state.language {
            // 创建规则构建器
            let mut builder = RuleBuilder::new(state, "entry");
            
            // 应用入口规则
            let result = builder.apply(|s| {
                // 调用语言定义的入口规则
                language.parse_entry(s)
            });
            
            return builder.build(result);
        }
        
        Err(ParseError::new("未设置语言定义", 0))
    }
    
    /// 应用特定规则
    pub fn apply_rule<F>(&self, state: &mut ParserState, rule_name: &str, rule_fn: F) -> Result<Option<Node>>
    where
        F: FnOnce(&mut ParserState) -> Result<Option<Node>>,
    {
        state.apply_rule(rule_name, rule_fn)
    }
}

impl<'a> Parser for BasicParser<'a> {
    fn parse(&mut self, input: &str) -> Result<Node> {
        // 重置解析器状态
        self.state = RefCell::new(ParserState::new(Box::new(crate::peg::input::StringInputStream::new(input)))
            .with_language(self.language.clone()));
        
        // 调用语言的入口规则
        let mut state = self.state.borrow_mut();
        let result = self.parse_entry(&mut state)?;
        
        // 检查是否完全解析
        if !state.input.is_eof(state.position) && result.is_some() {
            let error = ParseError::new("未能完全解析输入", state.position);
            state.error_handler.record_error(error.clone());
            return Err(error);
        }
        
        result.ok_or_else(|| ParseError::new("解析失败", 0))
    }
    
    fn get_errors(&self) -> Vec<ParseError> {
        self.state.borrow().error_handler.get_errors().to_vec()
    }
}

/// 规则构建器
pub struct RuleBuilder<'a, 'b> {
    /// 解析器状态
    state: &'a mut ParserState<'b>,
    /// 规则名称
    name: String,
    /// 起始位置
    start_pos: usize,
}

impl<'a, 'b> RuleBuilder<'a, 'b> {
    /// 创建一个新的规则构建器
    pub fn new(state: &'a mut ParserState<'b>, name: impl Into<String>) -> Self {
        let name = name.into();
        let start_pos = state.position;
        Self { state, name, start_pos }
    }
    
    /// 应用规则函数
    pub fn apply<F, R>(&mut self, rule_fn: F) -> Result<Option<Node>>
    where
        F: FnOnce(&mut ParserState<'b>) -> Result<R>,
        R: Into<Option<Node>>,
    {
        let result = rule_fn(self.state).map(Into::into);
        
        // 处理错误
        if let Err(error) = &result {
            match self.state.handle_error(error.clone()) {
                RecoveryStrategy::SkipToken => {
                    // 跳过当前标记
                    if !self.state.input.is_eof(self.state.position) {
                        self.state.position += 1;
                    }
                    return Ok(None);
                },
                RecoveryStrategy::Backtrack => {
                    // 回溯到规则开始位置
                    self.state.position = self.start_pos;
                    return Ok(None);
                },
                RecoveryStrategy::Abort => {
                    // 终止解析
                    return Err(error.clone());
                },
                _ => {}
            }
        }
        
        result
    }
    
    /// 完成规则构建
    pub fn build(self, result: Result<Option<Node>>) -> Result<Option<Node>> {
        result
    }
}