//! 语言定义模块
//!
//! 提供语言定义的抽象和实现，支持自定义规则和语法。

use std::rc::Rc;

use crate::peg::ast::Node;
use crate::peg::parser::ParserState;
use crate::errors::Result;

/// 语言定义trait
pub trait Language {
    /// 解析入口规则
    fn parse_entry(&self, state: &mut ParserState) -> Result<Option<Node>>;
    
    /// 获取语言名称
    fn name(&self) -> &str;
    
    /// 获取语言ID
    fn id(&self) -> u32;
    
    /// 解析空白字符
    fn parse_whitespace(&self, state: &mut ParserState) -> Result<Option<Node>> {
        // 默认实现：匹配空格和制表符
        let start = state.position();
        let mut current = start;
        
        while let Some(next) = state.input().match_char(' ', current).or_else(|| state.input().match_char('\t', current)) {
            current = next;
        }
        
        if current > start {
            // 创建空白节点
            let node = state.create_leaf_node(self.id(), 0, 0, start, current);
            Ok(Some(node))
        } else {
            Ok(None)
        }
    }
    
    /// 解析换行符
    fn parse_newline(&self, state: &mut ParserState) -> Result<Option<Node>> {
        // 默认实现：匹配\n或\r\n
        let start = state.position();
        
        if let Some(next) = state.input().match_str("\r\n", start) {
            let node = state.create_leaf_node(self.id(), 0, 0, start, next);
            Ok(Some(node))
        } else if let Some(next) = state.input().match_char('\n', start) {
            let node = state.create_leaf_node(self.id(), 0, 0, start, next);
            Ok(Some(node))
        } else {
            Ok(None)
        }
    }
    
    /// 解析注释
    fn parse_comment(&self, state: &mut ParserState) -> Result<Option<Node>> {
        // 默认实现：无注释
        Ok(None)
    }
    
    /// 解析忽略内容（空白、换行、注释）
    fn parse_ignored(&self, state: &mut ParserState) -> Result<Option<Node>> {
        let start = state.position();
        let mut current = start;
        let mut found = false;
        
        loop {
            let mut advanced = false;
            
            // 尝试匹配空白
            if let Ok(Some(node)) = self.parse_whitespace(state) {
                current = node.end;
                state.set_position(current);
                advanced = true;
                found = true;
            }
            
            // 尝试匹配换行
            if let Ok(Some(node)) = self.parse_newline(state) {
                current = node.end;
                state.set_position(current);
                advanced = true;
                found = true;
            }
            
            // 尝试匹配注释
            if let Ok(Some(node)) = self.parse_comment(state) {
                current = node.end;
                state.set_position(current);
                advanced = true;
                found = true;
            }
            
            if !advanced {
                break;
            }
        }
        
        if found {
            let node = state.create_leaf_node(self.id(), 0, 0, start, current);
            Ok(Some(node))
        } else {
            Ok(None)
        }
    }
}

/// 基本语言实现
pub struct BasicLanguage {
    /// 语言名称
    name: String,
    /// 语言ID
    id: u32,
}

impl BasicLanguage {
    /// 创建一个新的基本语言
    pub fn new(name: impl Into<String>, id: u32) -> Self {
        Self {
            name: name.into(),
            id,
        }
    }
}

impl Language for BasicLanguage {
    fn parse_entry(&self, _state: &mut ParserState) -> Result<Option<Node>> {
        // 基本语言没有入口规则
        Ok(None)
    }
    
    fn name(&self) -> &str {
        &self.name
    }
    
    fn id(&self) -> u32 {
        self.id
    }
}