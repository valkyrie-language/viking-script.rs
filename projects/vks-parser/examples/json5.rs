//! JSON5解析器示例
//!
//! 实现一个简单的JSON5解析器，支持JSON5的扩展特性。

use std::{cell::RefCell, rc::Rc};

use crate::peg::{
    ast::{Node, NodeType},
    error::{ParseError, Result},
    input::InputStream,
    language::Language,
    parser::{Parser, ParserState, RuleBuilder},
};

/// JSON5值类型
#[derive(Debug, Clone, PartialEq)]
pub enum Json5Value {
    /// null值
    Null,
    /// 布尔值
    Boolean(bool),
    /// 数字
    Number(f64),
    /// 字符串
    String(String),
    /// 数组
    Array(Vec<Json5Value>),
    /// 对象
    Object(Vec<(String, Json5Value)>),
}

/// JSON5解析器
pub struct Json5Parser {
    /// 是否允许注释
    allow_comments: bool,
    /// 是否允许尾随逗号
    allow_trailing_commas: bool,
}

impl Json5Parser {
    /// 创建一个新的JSON5解析器
    pub fn new() -> Self {
        Self { allow_comments: true, allow_trailing_commas: true }
    }

    /// 设置是否允许注释
    pub fn with_comments(mut self, allow: bool) -> Self {
        self.allow_comments = allow;
        self
    }

    /// 设置是否允许尾随逗号
    pub fn with_trailing_commas(mut self, allow: bool) -> Self {
        self.allow_trailing_commas = allow;
        self
    }

    /// 解析JSON5文本
    pub fn parse(&self, input: &str) -> Result<Json5Value> {
        let mut state = ParserState::new(Box::new(crate::peg::input::StringInputStream::new(input)));

        // 解析值
        let result = self.parse_value(&mut state)?;

        // 跳过空白和注释
        self.skip_whitespace(&mut state);

        // 检查是否完全解析
        if !state.input.is_eof(state.position) {
            return Err(ParseError::new("未能完全解析输入", state.position));
        }

        // 将AST转换为JSON5值
        self.node_to_value(&result)
    }

    /// 解析JSON5值
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

        if let Some(node) = self.parse_array(state)? {
            return Ok(node);
        }

        if let Some(node) = self.parse_object(state)? {
            return Ok(node);
        }

        Err(ParseError::new("预期JSON5值", state.position).with_expected("null, boolean, number, string, array or object"))
    }

    /// 解析null值
    fn parse_null(&self, state: &mut ParserState) -> Result<Option<Node>> {
        let mut builder = RuleBuilder::new(state, "null");

        builder.apply(|state| {
            let start = state.position;

            // 匹配"null"
            if let Some(range) = state.input.match_str(state.position, "null") {
                state.position += 4;
                let node = state.create_node(NodeType::Literal("null".to_string()), start, range.end);
                Ok(node)
            }
            else {
                Err(ParseError::new("预期'null'", state.position))
            }
        })
    }

    /// 解析布尔值
    fn parse_boolean(&self, state: &mut ParserState) -> Result<Option<Node>> {
        let mut builder = RuleBuilder::new(state, "boolean");

        builder.apply(|state| {
            let start = state.position;

            // 匹配"true"或"false"
            if let Some(range) = state.input.match_str(state.position, "true") {
                state.position += 4;
                let node = state.create_node(NodeType::Literal("true".to_string()), start, range.end);
                Ok(node)
            }
            else if let Some(range) = state.input.match_str(state.position, "false") {
                state.position += 5;
                let node = state.create_node(NodeType::Literal("false".to_string()), start, range.end);
                Ok(node)
            }
            else {
                Err(ParseError::new("预期'true'或'false'", state.position))
            }
        })
    }

    /// 解析数字
    fn parse_number(&self, state: &mut ParserState) -> Result<Option<Node>> {
        let mut builder = RuleBuilder::new(state, "number");

        builder.apply(|state| {
            let start = state.position;
            let mut end = start;

            // 匹配可选的正负号
            if let Some(c) = state.input.char_at(end) {
                if c == '+' || c == '-' {
                    end += 1;
                }
            }

            // 匹配整数部分
            let mut has_digits = false;
            while let Some(c) = state.input.char_at(end) {
                if c.is_ascii_digit() {
                    end += 1;
                    has_digits = true;
                }
                else {
                    break;
                }
            }

            // 匹配小数部分
            if let Some('.') = state.input.char_at(end) {
                end += 1;

                // 匹配小数点后的数字
                let mut has_fraction_digits = false;
                while let Some(c) = state.input.char_at(end) {
                    if c.is_ascii_digit() {
                        end += 1;
                        has_fraction_digits = true;
                    }
                    else {
                        break;
                    }
                }

                has_digits = has_digits || has_fraction_digits;
            }

            // 匹配指数部分
            if let Some(c) = state.input.char_at(end) {
                if c == 'e' || c == 'E' {
                    end += 1;

                    // 匹配指数的正负号
                    if let Some(c) = state.input.char_at(end) {
                        if c == '+' || c == '-' {
                            end += 1;
                        }
                    }

                    // 匹配指数的数字
                    let mut has_exponent_digits = false;
                    while let Some(c) = state.input.char_at(end) {
                        if c.is_ascii_digit() {
                            end += 1;
                            has_exponent_digits = true;
                        }
                        else {
                            break;
                        }
                    }

                    if !has_exponent_digits {
                        return Err(ParseError::new("预期指数部分的数字", end));
                    }
                }
            }

            if !has_digits {
                return Err(ParseError::new("预期数字", state.position));
            }

            // 创建节点
            let text = state.input.slice(start..end);
            state.position = end;
            let node = state.create_node(NodeType::Literal(text), start, end);
            Ok(node)
        })
    }

    /// 解析字符串
    fn parse_string(&self, state: &mut ParserState) -> Result<Option<Node>> {
        let mut builder = RuleBuilder::new(state, "string");

        builder.apply(|state| {
            let start = state.position;

            // 匹配引号
            let quote = match state.input.char_at(start) {
                Some('"') => '"',
                Some('\'') => '\'',
                _ => return Err(ParseError::new("预期字符串", start)),
            };

            let mut end = start + 1;
            let mut escaped = false;

            // 匹配字符串内容
            loop {
                match state.input.char_at(end) {
                    None => return Err(ParseError::new("未闭合的字符串", start)),
                    Some('\\') if !escaped => {
                        escaped = true;
                        end += 1;
                    }
                    Some(c) if c == quote && !escaped => {
                        end += 1;
                        break;
                    }
                    Some(_) => {
                        escaped = false;
                        end += 1;
                    }
                }
            }

            // 创建节点
            state.position = end;
            let node = state.create_node(NodeType::Literal(state.input.slice(start..end)), start, end);
            Ok(node)
        })
    }

    /// 解析数组
    fn parse_array(&self, state: &mut ParserState) -> Result<Option<Node>> {
        let mut builder = RuleBuilder::new(state, "array");

        builder.apply(|state| {
            let start = state.position;

            // 匹配'['
            if state.input.char_at(state.position) != Some('[') {
                return Err(ParseError::new("预期'['", state.position));
            }
            state.position += 1;

            // 创建数组节点
            let mut array_node = state.create_node(NodeType::Rule("array".to_string()), start, start + 1);

            // 跳过空白和注释
            self.skip_whitespace(state);

            // 检查是否为空数组
            if state.input.char_at(state.position) == Some(']') {
                state.position += 1;
                array_node.end = state.position;
                return Ok(array_node);
            }

            // 解析数组元素
            loop {
                // 解析元素值
                let element = self.parse_value(state)?;
                array_node.add_child(element);

                // 跳过空白和注释
                self.skip_whitespace(state);

                // 检查是否有逗号
                if state.input.char_at(state.position) == Some(',') {
                    state.position += 1;

                    // 跳过空白和注释
                    self.skip_whitespace(state);

                    // 检查是否有尾随逗号
                    if self.allow_trailing_commas && state.input.char_at(state.position) == Some(']') {
                        state.position += 1;
                        array_node.end = state.position;
                        return Ok(array_node);
                    }
                }
                else if state.input.char_at(state.position) == Some(']') {
                    state.position += 1;
                    array_node.end = state.position;
                    return Ok(array_node);
                }
                else {
                    return Err(ParseError::new("预期','或']'", state.position));
                }
            }
        })
    }

    /// 解析对象
    fn parse_object(&self, state: &mut ParserState) -> Result<Option<Node>> {
        let mut builder = RuleBuilder::new(state, "object");

        builder.apply(|state| {
            let start = state.position;

            // 匹配'{'
            if state.input.char_at(state.position) != Some('{') {
                return Err(ParseError::new("预期'{'", state.position));
            }
            state.position += 1;

            // 创建对象节点
            let mut object_node = state.create_node(NodeType::Rule("object".to_string()), start, start + 1);

            // 跳过空白和注释
            self.skip_whitespace(state);

            // 检查是否为空对象
            if state.input.char_at(state.position) == Some('}') {
                state.position += 1;
                object_node.end = state.position;
                return Ok(object_node);
            }

            // 解析对象属性
            loop {
                // 解析属性名
                let key = if let Some(c) = state.input.char_at(state.position) {
                    if c == '"' || c == '\'' {
                        // 字符串键
                        self.parse_string(state)?
                    }
                    else if c.is_ascii_alphabetic() || c == '_' || c == '$' {
                        // 标识符键
                        self.parse_identifier(state)?
                    }
                    else {
                        return Err(ParseError::new("预期属性名", state.position));
                    }
                }
                else {
                    return Err(ParseError::new("预期属性名", state.position));
                };

                // 添加键节点
                let mut pair_node = state.create_node(NodeType::Rule("pair".to_string()), key.start, key.end);
                pair_node.add_child(key);

                // 跳过空白和注释
                self.skip_whitespace(state);

                // 匹配':'
                if state.input.char_at(state.position) != Some(':') {
                    return Err(ParseError::new("预期':'", state.position));
                }
                state.position += 1;

                // 跳过空白和注释
                self.skip_whitespace(state);

                // 解析属性值
                let value = self.parse_value(state)?;
                pair_node.add_child(value);
                pair_node.end = value.end;

                // 添加键值对节点
                object_node.add_child(pair_node);

                // 跳过空白和注释
                self.skip_whitespace(state);

                // 检查是否有逗号
                if state.input.char_at(state.position) == Some(',') {
                    state.position += 1;

                    // 跳过空白和注释
                    self.skip_whitespace(state);

                    // 检查是否有尾随逗号
                    if self.allow_trailing_commas && state.input.char_at(state.position) == Some('}') {
                        state.position += 1;
                        object_node.end = state.position;
                        return Ok(object_node);
                    }
                }
                else if state.input.char_at(state.position) == Some('}') {
                    state.position += 1;
                    object_node.end = state.position;
                    return Ok(object_node);
                }
                else {
                    return Err(ParseError::new("预期','或'}'", state.position));
                }
            }
        })
    }

    /// 解析标识符
    fn parse_identifier(&self, state: &mut ParserState) -> Result<Option<Node>> {
        let mut builder = RuleBuilder::new(state, "identifier");

        builder.apply(|state| {
            let start = state.position;
            let mut end = start;

            // 匹配标识符的第一个字符
            if let Some(c) = state.input.char_at(end) {
                if c.is_ascii_alphabetic() || c == '_' || c == '$' {
                    end += 1;
                }
                else {
                    return Err(ParseError::new("预期标识符", state.position));
                }
            }
            else {
                return Err(ParseError::new("预期标识符", state.position));
            }

            // 匹配标识符的剩余字符
            while let Some(c) = state.input.char_at(end) {
                if c.is_ascii_alphanumeric() || c == '_' || c == '$' {
                    end += 1;
                }
                else {
                    break;
                }
            }

            // 创建节点
            state.position = end;
            let node = state.create_node(NodeType::Token("identifier".to_string()), start, end);
            Ok(node)
        })
    }

    /// 跳过空白和注释
    fn skip_whitespace(&self, state: &mut ParserState) {
        loop {
            let start = state.position;

            // 跳过空白字符
            while let Some(c) = state.input.char_at(state.position) {
                if c.is_whitespace() {
                    state.position += 1;
                }
                else {
                    break;
                }
            }

            // 跳过注释
            if self.allow_comments {
                if let Some('/') = state.input.char_at(state.position) {
                    if let Some(next) = state.input.char_at(state.position + 1) {
                        if next == '/' {
                            // 单行注释
                            state.position += 2;
                            while let Some(c) = state.input.char_at(state.position) {
                                if c == '\n' {
                                    state.position += 1;
                                    break;
                                }
                                state.position += 1;
                            }
                            continue;
                        }
                        else if next == '*' {
                            // 多行注释
                            state.position += 2;
                            while let (Some(c), Some(next)) =
                                (state.input.char_at(state.position), state.input.char_at(state.position + 1))
                            {
                                if c == '*' && next == '/' {
                                    state.position += 2;
                                    break;
                                }
                                state.position += 1;
                            }
                            continue;
                        }
                    }
                }
            }

            // 如果没有跳过任何字符，退出循环
            if state.position == start {
                break;
            }
        }
    }

    /// 将AST节点转换为JSON5值
    fn node_to_value(&self, node: &Node) -> Result<Json5Value> {
        match &node.node_type {
            NodeType::Literal(text) => {
                if text == "null" {
                    Ok(Json5Value::Null)
                }
                else if text == "true" {
                    Ok(Json5Value::Boolean(true))
                }
                else if text == "false" {
                    Ok(Json5Value::Boolean(false))
                }
                else if text.starts_with('"') || text.starts_with('\'') {
                    // 解析字符串
                    let content = &text[1..text.len() - 1];
                    // 这里应该处理转义字符，简化起见直接返回
                    Ok(Json5Value::String(content.to_string()))
                }
                else {
                    // 解析数字
                    match text.parse::<f64>() {
                        Ok(num) => Ok(Json5Value::Number(num)),
                        Err(_) => Err(ParseError::new(format!("无法解析数字: {}", text), node.start)),
                    }
                }
            }
            NodeType::Rule(rule) if rule == "array" => {
                let mut values = Vec::new();
                for child in &node.children {
                    values.push(self.node_to_value(child)?);
                }
                Ok(Json5Value::Array(values))
            }
            NodeType::Rule(rule) if rule == "object" => {
                let mut pairs = Vec::new();
                for pair in &node.children {
                    if pair.children.len() != 2 {
                        return Err(ParseError::new("无效的对象属性", pair.start));
                    }

                    // 获取键
                    let key = match &pair.children[0].node_type {
                        NodeType::Literal(text) if text.starts_with('"') || text.starts_with('\'') => {
                            // 字符串键
                            text[1..text.len() - 1].to_string()
                        }
                        NodeType::Token(token) if token == "identifier" => {
                            // 标识符键
                            let start = pair.children[0].start;
                            let end = pair.children[0].end;
                            let text = node.text(&node.input.slice(start..end));
                            text
                        }
                        _ => return Err(ParseError::new("无效的对象键", pair.children[0].start)),
                    };

                    // 获取值
                    let value = self.node_to_value(&pair.children[1])?;

                    pairs.push((key, value));
                }
                Ok(Json5Value::Object(pairs))
            }
            _ => Err(ParseError::new(format!("无法转换节点类型: {:?}", node.node_type), node.start)),
        }
    }
}

impl Parser for Json5Parser {
    fn parse(&mut self, input: &str) -> Result<Node> {
        let mut state = ParserState::new(Box::new(crate::peg::input::StringInputStream::new(input)));

        // 解析值
        let result = self.parse_value(&mut state)?;

        // 跳过空白和注释
        self.skip_whitespace(&mut state);

        // 检查是否完全解析
        if !state.input.is_eof(state.position) {
            let error = ParseError::new("未能完全解析输入", state.position);
            state.error_handler.record_error(error.clone());
            return Err(error);
        }

        Ok(result)
    }

    fn get_errors(&self) -> Vec<ParseError> {
        Vec::new() // 简化实现，实际应该从状态中获取
    }
}
fn main() {}
