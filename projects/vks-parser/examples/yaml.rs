//! YAML解析器示例
//!
//! 实现一个简单的YAML解析器，支持基本的YAML语法和缩进敏感的文法。

use std::{cell::RefCell, collections::HashMap, rc::Rc};

use crate::peg::{
    ast::{Node, NodeType},
    error::{ParseError, Result},
    input::InputStream,
    language::Language,
    parser::{Parser, ParserState, RuleBuilder},
};

/// YAML值类型
#[derive(Debug, Clone, PartialEq)]
pub enum YamlValue {
    /// null值
    Null,
    /// 布尔值
    Boolean(bool),
    /// 数字
    Number(f64),
    /// 字符串
    String(String),
    /// 数组
    Sequence(Vec<YamlValue>),
    /// 映射
    Mapping(HashMap<String, YamlValue>),
}

/// YAML解析器
pub struct YamlParser {
    /// 当前缩进级别
    current_indent: usize,
    /// 缩进宽度
    indent_width: usize,
}

impl YamlParser {
    /// 创建一个新的YAML解析器
    pub fn new() -> Self {
        Self { current_indent: 0, indent_width: 2 }
    }

    /// 设置缩进宽度
    pub fn with_indent_width(mut self, width: usize) -> Self {
        self.indent_width = width;
        self
    }

    /// 解析YAML文本
    pub fn parse(&self, input: &str) -> Result<YamlValue> {
        let mut state = ParserState::new(Box::new(crate::peg::input::StringInputStream::new(input)));

        // 解析文档
        let result = self.parse_document(&mut state)?;

        // 检查是否完全解析
        if !state.input.is_eof(state.position) {
            return Err(ParseError::new("未能完全解析输入", state.position));
        }

        // 将AST转换为YAML值
        self.node_to_value(&result)
    }

    /// 解析YAML文档
    fn parse_document(&self, state: &mut ParserState) -> Result<Node> {
        // 跳过空白和注释
        self.skip_whitespace(state);

        // 解析文档内容
        let mut builder = RuleBuilder::new(state, "document");
        let result = builder.apply(|s| self.parse_value(s));

        builder.build(result)
    }

    /// 解析YAML值
    fn parse_value(&self, state: &mut ParserState) -> Result<Node> {
        // 跳过空白和注释
        self.skip_whitespace(state);

        // 尝试解析各种值类型
        if let Some(node) = self.parse_null(state)? {
            return Ok(node);
        }

        if let Some(node) = self.parse_boolean(state)? {
            return Ok(node);
        }

        if let Some(node) = self.parse_number(state)? {
            return Ok(node);
        }

        if let Some(node) = self.parse_string(state)? {
            return Ok(node);
        }

        if let Some(node) = self.parse_sequence(state)? {
            return Ok(node);
        }

        if let Some(node) = self.parse_mapping(state)? {
            return Ok(node);
        }

        Err(ParseError::new("无法解析YAML值", state.position))
    }

    /// 解析null值
    fn parse_null(&self, state: &mut ParserState) -> Result<Option<Node>> {
        let start = state.position;

        // 匹配null、~、NULL等表示空值的标记
        if self.match_literal(state, "null") || self.match_literal(state, "~") || self.match_literal(state, "NULL") {
            let node = state.create_node(NodeType::Token("null".to_string()), start, state.position);
            return Ok(Some(node));
        }

        Ok(None)
    }

    /// 解析布尔值
    fn parse_boolean(&self, state: &mut ParserState) -> Result<Option<Node>> {
        let start = state.position;

        // 匹配true、yes、on等表示真值的标记
        if self.match_literal(state, "true") || self.match_literal(state, "yes") || self.match_literal(state, "on") {
            let node = state.create_node(NodeType::Token("true".to_string()), start, state.position);
            return Ok(Some(node));
        }

        // 匹配false、no、off等表示假值的标记
        if self.match_literal(state, "false") || self.match_literal(state, "no") || self.match_literal(state, "off") {
            let node = state.create_node(NodeType::Token("false".to_string()), start, state.position);
            return Ok(Some(node));
        }

        Ok(None)
    }

    /// 解析数字
    fn parse_number(&self, state: &mut ParserState) -> Result<Option<Node>> {
        let start = state.position;

        // 检查负号
        let has_sign = self.match_char(state, '-') || self.match_char(state, '+');

        // 解析整数部分
        let mut has_digits = false;
        while let Some(c) = state.input.char_at(state.position) {
            if c.is_ascii_digit() {
                state.position += 1;
                has_digits = true;
            }
            else {
                break;
            }
        }

        // 解析小数部分
        let mut has_fraction = false;
        if let Some('.') = state.input.char_at(state.position) {
            state.position += 1;

            while let Some(c) = state.input.char_at(state.position) {
                if c.is_ascii_digit() {
                    state.position += 1;
                    has_digits = true;
                    has_fraction = true;
                }
                else {
                    break;
                }
            }
        }

        // 解析指数部分
        let mut has_exponent = false;
        if let Some(c) = state.input.char_at(state.position) {
            if c == 'e' || c == 'E' {
                state.position += 1;

                // 指数符号
                if let Some(c) = state.input.char_at(state.position) {
                    if c == '+' || c == '-' {
                        state.position += 1;
                    }
                }

                // 指数数字
                let mut has_exp_digits = false;
                while let Some(c) = state.input.char_at(state.position) {
                    if c.is_ascii_digit() {
                        state.position += 1;
                        has_exp_digits = true;
                    }
                    else {
                        break;
                    }
                }

                if !has_exp_digits {
                    // 指数部分必须有数字
                    state.position = start;
                    return Ok(None);
                }

                has_exponent = true;
            }
        }

        if has_digits {
            let node = state.create_node(NodeType::Token("number".to_string()), start, state.position);
            return Ok(Some(node));
        }

        // 回溯
        state.position = start;
        Ok(None)
    }

    /// 解析字符串
    fn parse_string(&self, state: &mut ParserState) -> Result<Option<Node>> {
        let start = state.position;

        // 检查引号类型
        let quote = state.input.char_at(state.position);
        let is_quoted = quote == Some('"') || quote == Some('\'');

        if is_quoted {
            // 引号字符串
            state.position += 1;
            let quote_char = quote.unwrap();

            while let Some(c) = state.input.char_at(state.position) {
                if c == quote_char {
                    state.position += 1;
                    let node = state.create_node(NodeType::Token("string".to_string()), start, state.position);
                    return Ok(Some(node));
                }
                else if c == '\\' {
                    // 转义字符
                    state.position += 1;
                    if state.input.is_eof(state.position) {
                        return Err(ParseError::new("未闭合的字符串", start));
                    }
                    state.position += 1;
                }
                else {
                    state.position += 1;
                }
            }

            return Err(ParseError::new("未闭合的字符串", start));
        }
        else {
            // 非引号字符串（到行尾或特殊字符为止）
            let mut length = 0;
            while let Some(c) = state.input.char_at(state.position) {
                if c == ':' || c == ',' || c == '}' || c == ']' || c == '\n' || c == '\r' || c.is_whitespace() {
                    break;
                }
                state.position += 1;
                length += 1;
            }

            if length > 0 {
                let node = state.create_node(NodeType::Token("string".to_string()), start, state.position);
                return Ok(Some(node));
            }
        }

        // 回溯
        state.position = start;
        Ok(None)
    }

    /// 解析序列（数组）
    fn parse_sequence(&self, state: &mut ParserState) -> Result<Option<Node>> {
        let start = state.position;

        // 检查是否是流式序列 [item1, item2, ...]
        if self.match_char(state, '[') {
            let mut children = Vec::new();

            // 跳过空白和注释
            self.skip_whitespace(state);

            // 空序列
            if self.match_char(state, ']') {
                let node = state.create_node(NodeType::Rule("sequence".to_string()), start, state.position);
                return Ok(Some(node));
            }

            // 解析序列项
            loop {
                // 解析值
                let item = self.parse_value(state)?;
                children.push(item);

                // 跳过空白和注释
                self.skip_whitespace(state);

                // 检查逗号或结束
                if self.match_char(state, ',') {
                    // 跳过空白和注释
                    self.skip_whitespace(state);

                    // 允许尾随逗号
                    if self.match_char(state, ']') {
                        break;
                    }
                }
                else if self.match_char(state, ']') {
                    break;
                }
                else {
                    return Err(ParseError::new("期望','或']'", state.position));
                }
            }

            let node = state.create_node(NodeType::Rule("sequence".to_string()), start, state.position);
            node.set_children(children);
            return Ok(Some(node));
        }

        // 检查是否是块序列 - item1\n - item2\n ...
        if self.match_char(state, '-') && self.match_char(state, ' ') {
            let mut children = Vec::new();
            let current_indent = self.get_current_indent(state);

            // 解析第一个项
            let item = self.parse_value(state)?;
            children.push(item);

            // 解析后续项
            loop {
                // 跳过空白和注释
                self.skip_whitespace(state);

                // 检查缩进级别
                let indent = self.get_current_indent(state);
                if indent < current_indent {
                    break;
                }

                // 检查序列项标记
                if self.match_char(state, '-') && self.match_char(state, ' ') {
                    // 解析值
                    let item = self.parse_value(state)?;
                    children.push(item);
                }
                else {
                    break;
                }
            }

            let node = state.create_node(NodeType::Rule("sequence".to_string()), start, state.position);
            node.set_children(children);
            return Ok(Some(node));
        }

        // 回溯
        state.position = start;
        Ok(None)
    }

    /// 解析映射（对象）
    fn parse_mapping(&self, state: &mut ParserState) -> Result<Option<Node>> {
        let start = state.position;

        // 检查是否是流式映射 {key: value, ...}
        if self.match_char(state, '{') {
            let mut children = Vec::new();

            // 跳过空白和注释
            self.skip_whitespace(state);

            // 空映射
            if self.match_char(state, '}') {
                let node = state.create_node(NodeType::Rule("mapping".to_string()), start, state.position);
                return Ok(Some(node));
            }

            // 解析映射项
            loop {
                // 解析键
                let key = self.parse_string(state)?.ok_or_else(|| ParseError::new("期望映射键", state.position))?;

                // 跳过空白和注释
                self.skip_whitespace(state);

                // 检查冒号
                if !self.match_char(state, ':') {
                    return Err(ParseError::new("期望':'", state.position));
                }

                // 跳过空白和注释
                self.skip_whitespace(state);

                // 解析值
                let value = self.parse_value(state)?;

                // 创建键值对节点
                let pair_start = key.range().start;
                let pair_end = value.range().end;
                let pair = state.create_node(NodeType::Rule("pair".to_string()), pair_start, pair_end);
                pair.add_child(key);
                pair.add_child(value);
                children.push(pair);

                // 跳过空白和注释
                self.skip_whitespace(state);

                // 检查逗号或结束
                if self.match_char(state, ',') {
                    // 跳过空白和注释
                    self.skip_whitespace(state);

                    // 允许尾随逗号
                    if self.match_char(state, '}') {
                        break;
                    }
                }
                else if self.match_char(state, '}') {
                    break;
                }
                else {
                    return Err(ParseError::new("期望','或'}'", state.position));
                }
            }

            let node = state.create_node(NodeType::Rule("mapping".to_string()), start, state.position);
            node.set_children(children);
            return Ok(Some(node));
        }

        // 检查是否是块映射 key: value\n key2: value2\n ...
        let key_start = state.position;
        if let Some(key) = self.parse_string(state)? {
            // 跳过空白
            self.skip_whitespace(state);

            // 检查冒号
            if self.match_char(state, ':') {
                // 跳过空白
                self.skip_whitespace(state);

                // 解析值
                let value = self.parse_value(state)?;

                // 创建键值对节点
                let pair_start = key_start;
                let pair_end = value.range().end;
                let pair = state.create_node(NodeType::Rule("pair".to_string()), pair_start, pair_end);
                pair.add_child(key);
                pair.add_child(value);

                // 创建映射节点
                let node = state.create_node(NodeType::Rule("mapping".to_string()), start, state.position);
                node.add_child(pair);

                // 解析后续键值对
                let current_indent = self.get_current_indent(state);
                loop {
                    // 跳过空白和注释
                    self.skip_whitespace(state);

                    // 检查缩进级别
                    let indent = self.get_current_indent(state);
                    if indent < current_indent {
                        break;
                    }

                    // 解析键
                    let key_start = state.position;
                    if let Some(key) = self.parse_string(state)? {
                        // 跳过空白
                        self.skip_whitespace(state);

                        // 检查冒号
                        if self.match_char(state, ':') {
                            // 跳过空白
                            self.skip_whitespace(state);

                            // 解析值
                            let value = self.parse_value(state)?;

                            // 创建键值对节点
                            let pair_start = key_start;
                            let pair_end = value.range().end;
                            let pair = state.create_node(NodeType::Rule("pair".to_string()), pair_start, pair_end);
                            pair.add_child(key);
                            pair.add_child(value);
                            node.add_child(pair);
                        }
                        else {
                            // 回溯
                            state.position = key_start;
                            break;
                        }
                    }
                    else {
                        break;
                    }
                }

                return Ok(Some(node));
            }
        }

        // 回溯
        state.position = start;
        Ok(None)
    }

    /// 跳过空白和注释
    fn skip_whitespace(&self, state: &mut ParserState) {
        loop {
            // 跳过空白
            while let Some(c) = state.input.char_at(state.position) {
                if c.is_whitespace() {
                    state.position += 1;
                }
                else {
                    break;
                }
            }

            // 跳过注释
            if let Some('#') = state.input.char_at(state.position) {
                state.position += 1;

                // 跳到行尾
                while let Some(c) = state.input.char_at(state.position) {
                    state.position += 1;
                    if c == '\n' {
                        break;
                    }
                }

                // 继续跳过空白
                continue;
            }

            break;
        }
    }

    /// 匹配字符
    fn match_char(&self, state: &mut ParserState, c: char) -> bool {
        if let Some(input_c) = state.input.char_at(state.position) {
            if input_c == c {
                state.position += 1;
                return true;
            }
        }
        false
    }

    /// 匹配字面量
    fn match_literal(&self, state: &mut ParserState, literal: &str) -> bool {
        let start = state.position;

        for c in literal.chars() {
            if !self.match_char(state, c) {
                // 回溯
                state.position = start;
                return false;
            }
        }

        true
    }

    /// 获取当前缩进级别
    fn get_current_indent(&self, state: &mut ParserState) -> usize {
        let start = state.position;

        // 找到行首
        let mut line_start = start;
        while line_start > 0 {
            let prev = line_start - 1;
            if let Some('\n') = state.input.char_at(prev) {
                break;
            }
            line_start = prev;
        }

        // 计算缩进空格数
        let mut spaces = 0;
        let mut pos = line_start;
        while pos < start {
            if let Some(' ') = state.input.char_at(pos) {
                spaces += 1;
                pos += 1;
            }
            else if let Some('\t') = state.input.char_at(pos) {
                spaces += 8 - (spaces % 8); // Tab等于8个空格
                pos += 1;
            }
            else {
                break;
            }
        }

        spaces / self.indent_width
    }

    /// 将AST节点转换为YAML值
    fn node_to_value(&self, node: &Node) -> Result<YamlValue> {
        match node.node_type() {
            NodeType::Token(token) => {
                match token.as_str() {
                    "null" => Ok(YamlValue::Null),
                    "true" => Ok(YamlValue::Boolean(true)),
                    "false" => Ok(YamlValue::Boolean(false)),
                    "number" => {
                        // 获取数字文本
                        let text = node.text();
                        // 解析为浮点数
                        let value = text.parse::<f64>().map_err(|_| ParseError::new("无效的数字", node.range().start))?;
                        Ok(YamlValue::Number(value))
                    }
                    "string" => {
                        // 获取字符串文本
                        let mut text = node.text();

                        // 处理引号字符串
                        if text.starts_with('"') && text.ends_with('"') {
                            text = text[1..text.len() - 1].to_string();
                        }
                        else if text.starts_with('\'') && text.ends_with('\'') {
                            text = text[1..text.len() - 1].to_string();
                        }

                        Ok(YamlValue::String(text))
                    }
                    _ => Err(ParseError::new("未知的标记类型", node.range().start)),
                }
            }
            NodeType::Rule(rule) => {
                match rule.as_str() {
                    "sequence" => {
                        let mut values = Vec::new();

                        // 处理子节点
                        for child in node.children() {
                            let value = self.node_to_value(child)?;
                            values.push(value);
                        }

                        Ok(YamlValue::Sequence(values))
                    }
                    "mapping" => {
                        let mut map = HashMap::new();

                        // 处理键值对
                        for pair in node.children() {
                            if pair.children().len() != 2 {
                                return Err(ParseError::new("无效的键值对", pair.range().start));
                            }

                            // 获取键和值
                            let key_node = &pair.children()[0];
                            let value_node = &pair.children()[1];

                            // 键必须是字符串
                            let key = match self.node_to_value(key_node)? {
                                YamlValue::String(s) => s,
                                _ => return Err(ParseError::new("映射键必须是字符串", key_node.range().start)),
                            };

                            // 解析值
                            let value = self.node_to_value(value_node)?;

                            // 添加到映射
                            map.insert(key, value);
                        }

                        Ok(YamlValue::Mapping(map))
                    }
                    _ => Err(ParseError::new("未知的规则类型", node.range().start)),
                }
            }
        }
    }
}

impl Default for YamlParser {
    fn default() -> Self {
        Self::new()
    }
}
fn main() {}
