//! 计算器解析器示例
//!
//! 实现一个简单的计算器，支持基本的数学表达式解析和求值。

use std::{cell::RefCell, rc::Rc};

use crate::peg::{
    ast::{Node, NodeType},
    error::{ParseError, Result},
    input::InputStream,
    language::Language,
    parser::{Parser, ParserState, RuleBuilder},
};

/// 表达式类型
#[derive(Debug, Clone, PartialEq)]
pub enum Expression {
    /// 数字
    Number(f64),
    /// 二元操作
    Binary {
        /// 操作符
        op: Operator,
        /// 左操作数
        left: Box<Expression>,
        /// 右操作数
        right: Box<Expression>,
    },
    /// 一元操作
    Unary {
        /// 操作符
        op: Operator,
        /// 操作数
        expr: Box<Expression>,
    },
}

/// 操作符类型
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Operator {
    /// 加法
    Add,
    /// 减法
    Subtract,
    /// 乘法
    Multiply,
    /// 除法
    Divide,
    /// 取负
    Negate,
}

/// 计算器解析器
pub struct CalculatorParser {
    /// 是否允许空格
    allow_whitespace: bool,
}

impl CalculatorParser {
    /// 创建一个新的计算器解析器
    pub fn new() -> Self {
        Self { allow_whitespace: true }
    }

    /// 设置是否允许空格
    pub fn with_whitespace(mut self, allow: bool) -> Self {
        self.allow_whitespace = allow;
        self
    }

    /// 解析并计算表达式
    pub fn evaluate(&self, input: &str) -> Result<f64> {
        let expr = self.parse(input)?;
        Ok(self.eval_expression(&expr))
    }

    /// 解析表达式
    pub fn parse(&self, input: &str) -> Result<Expression> {
        let mut state = ParserState::new(Box::new(crate::peg::input::StringInputStream::new(input)));

        // 解析表达式
        let result = self.parse_expression(&mut state)?;

        // 跳过空白
        if self.allow_whitespace {
            self.skip_whitespace(&mut state);
        }

        // 检查是否完全解析
        if !state.input.is_eof(state.position) {
            return Err(ParseError::new("未能完全解析输入", state.position));
        }

        // 将AST转换为表达式
        self.node_to_expression(&result)
    }

    /// 解析表达式
    fn parse_expression(&self, state: &mut ParserState) -> Result<Node> {
        // 使用规则构建器处理加减法表达式
        let mut builder = RuleBuilder::new(state, "expression");
        let result = builder.apply(|s| self.parse_additive(s));

        builder.build(result)
    }

    /// 解析加减法表达式
    fn parse_additive(&self, state: &mut ParserState) -> Result<Node> {
        let start = state.position;

        // 解析左操作数（乘除法表达式）
        let mut left = self.parse_multiplicative(state)?;

        // 循环解析加减法
        loop {
            // 跳过空白
            if self.allow_whitespace {
                self.skip_whitespace(state);
            }

            // 检查操作符
            let op_pos = state.position;
            let op = if self.match_char(state, '+') {
                "+"
            }
            else if self.match_char(state, '-') {
                "-"
            }
            else {
                break;
            };

            // 跳过空白
            if self.allow_whitespace {
                self.skip_whitespace(state);
            }

            // 解析右操作数（乘除法表达式）
            let right = self.parse_multiplicative(state)?;

            // 创建操作符节点
            let op_node = state.create_node(NodeType::Token(op.to_string()), op_pos, op_pos + 1);

            // 创建二元表达式节点
            let end = state.position;
            let binary = state.create_node(NodeType::Rule("binary".to_string()), start, end);
            binary.add_child(left);
            binary.add_child(op_node);
            binary.add_child(right);

            left = binary;
        }

        Ok(left)
    }

    /// 解析乘除法表达式
    fn parse_multiplicative(&self, state: &mut ParserState) -> Result<Node> {
        let start = state.position;

        // 解析左操作数（一元表达式）
        let mut left = self.parse_unary(state)?;

        // 循环解析乘除法
        loop {
            // 跳过空白
            if self.allow_whitespace {
                self.skip_whitespace(state);
            }

            // 检查操作符
            let op_pos = state.position;
            let op = if self.match_char(state, '*') {
                "*"
            }
            else if self.match_char(state, '/') {
                "/"
            }
            else {
                break;
            };

            // 跳过空白
            if self.allow_whitespace {
                self.skip_whitespace(state);
            }

            // 解析右操作数（一元表达式）
            let right = self.parse_unary(state)?;

            // 创建操作符节点
            let op_node = state.create_node(NodeType::Token(op.to_string()), op_pos, op_pos + 1);

            // 创建二元表达式节点
            let end = state.position;
            let binary = state.create_node(NodeType::Rule("binary".to_string()), start, end);
            binary.add_child(left);
            binary.add_child(op_node);
            binary.add_child(right);

            left = binary;
        }

        Ok(left)
    }

    /// 解析一元表达式
    fn parse_unary(&self, state: &mut ParserState) -> Result<Node> {
        let start = state.position;

        // 检查一元操作符
        if self.match_char(state, '-') {
            // 创建操作符节点
            let op_node = state.create_node(NodeType::Token("-".to_string()), start, start + 1);

            // 跳过空白
            if self.allow_whitespace {
                self.skip_whitespace(state);
            }

            // 解析操作数（一元表达式）
            let expr = self.parse_unary(state)?;

            // 创建一元表达式节点
            let end = state.position;
            let unary = state.create_node(NodeType::Rule("unary".to_string()), start, end);
            unary.add_child(op_node);
            unary.add_child(expr);

            return Ok(unary);
        }

        // 解析基本表达式
        self.parse_primary(state)
    }

    /// 解析基本表达式（数字或括号表达式）
    fn parse_primary(&self, state: &mut ParserState) -> Result<Node> {
        // 跳过空白
        if self.allow_whitespace {
            self.skip_whitespace(state);
        }

        let start = state.position;

        // 检查括号表达式
        if self.match_char(state, '(') {
            // 跳过空白
            if self.allow_whitespace {
                self.skip_whitespace(state);
            }

            // 解析括号内的表达式
            let expr = self.parse_expression(state)?;

            // 跳过空白
            if self.allow_whitespace {
                self.skip_whitespace(state);
            }

            // 检查右括号
            if !self.match_char(state, ')') {
                return Err(ParseError::new("期望')'", state.position));
            }

            return Ok(expr);
        }

        // 解析数字
        if let Some(node) = self.parse_number(state)? {
            return Ok(node);
        }

        Err(ParseError::new("期望表达式", state.position))
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

        if has_digits {
            let node = state.create_node(NodeType::Token("number".to_string()), start, state.position);
            return Ok(Some(node));
        }

        // 回溯
        state.position = start;
        Ok(None)
    }

    /// 跳过空白
    fn skip_whitespace(&self, state: &mut ParserState) {
        while let Some(c) = state.input.char_at(state.position) {
            if c.is_whitespace() {
                state.position += 1;
            }
            else {
                break;
            }
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

    /// 将AST节点转换为表达式
    fn node_to_expression(&self, node: &Node) -> Result<Expression> {
        match node.node_type() {
            NodeType::Token(token) => {
                if token == "number" {
                    // 获取数字文本
                    let text = node.text();
                    // 解析为浮点数
                    let value = text.parse::<f64>().map_err(|_| ParseError::new("无效的数字", node.range().start))?;
                    Ok(Expression::Number(value))
                }
                else {
                    Err(ParseError::new("未知的标记类型", node.range().start))
                }
            }
            NodeType::Rule(rule) => {
                match rule.as_str() {
                    "binary" => {
                        // 二元表达式必须有三个子节点：左操作数、操作符、右操作数
                        if node.children().len() != 3 {
                            return Err(ParseError::new("无效的二元表达式", node.range().start));
                        }

                        // 获取左右操作数和操作符
                        let left = self.node_to_expression(&node.children()[0])?;
                        let op_node = &node.children()[1];
                        let right = self.node_to_expression(&node.children()[2])?;

                        // 获取操作符类型
                        let op = match op_node.text().as_str() {
                            "+" => Operator::Add,
                            "-" => Operator::Subtract,
                            "*" => Operator::Multiply,
                            "/" => Operator::Divide,
                            _ => return Err(ParseError::new("未知的操作符", op_node.range().start)),
                        };

                        Ok(Expression::Binary { op, left: Box::new(left), right: Box::new(right) })
                    }
                    "unary" => {
                        // 一元表达式必须有两个子节点：操作符和操作数
                        if node.children().len() != 2 {
                            return Err(ParseError::new("无效的一元表达式", node.range().start));
                        }

                        // 获取操作符和操作数
                        let op_node = &node.children()[0];
                        let expr = self.node_to_expression(&node.children()[1])?;

                        // 获取操作符类型
                        let op = match op_node.text().as_str() {
                            "-" => Operator::Negate,
                            _ => return Err(ParseError::new("未知的一元操作符", op_node.range().start)),
                        };

                        Ok(Expression::Unary { op, expr: Box::new(expr) })
                    }
                    _ => Err(ParseError::new("未知的规则类型", node.range().start)),
                }
            }
        }
    }

    /// 计算表达式的值
    fn eval_expression(&self, expr: &Expression) -> f64 {
        match expr {
            Expression::Number(n) => *n,
            Expression::Binary { op, left, right } => {
                let left_val = self.eval_expression(left);
                let right_val = self.eval_expression(right);

                match op {
                    Operator::Add => left_val + right_val,
                    Operator::Subtract => left_val - right_val,
                    Operator::Multiply => left_val * right_val,
                    Operator::Divide => left_val / right_val,
                    Operator::Negate => -left_val, // 不应该出现在二元表达式中
                }
            }
            Expression::Unary { op, expr } => {
                let val = self.eval_expression(expr);

                match op {
                    Operator::Negate => -val,
                    _ => val, // 其他操作符不应该出现在一元表达式中
                }
            }
        }
    }
}

impl Default for CalculatorParser {
    fn default() -> Self {
        Self::new()
    }
}

fn main() {}
