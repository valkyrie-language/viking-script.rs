//! 指令模块
//!
//! 提供PEG解析器的指令定义，包括规则和指令的枚举类型。

use std::fmt;
use serde::{Serialize, Deserialize};
use fancy_regex::Regex;

/// 规则ID类型
pub type RuleId = u32;

/// 标签ID类型
pub type TagId = u32;

/// 表示构建过程中的规则部分
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Rule {
    /// 引用另一个规则
    Rule { name: String },
    /// 匹配字面量字符串
    Literal { text: String },
    /// 引用正则表达式规则
    Regex { regex: String },
    /// 序列规则，所有部分必须按顺序匹配
    Sequence { rules: Vec<Rule> },
    /// 选择规则，匹配任意一个部分
    Choice { rules: Vec<Rule> },
    /// 重复规则，包括可选(0-1)、零或多个(0-u32::MAX)、一或多个(1-u32::MAX)
    Repeats { rule: Box<Rule>, min: u32, max: u32 },
    /// 前瞻规则，不消耗输入
    Lookahead { rule: Box<Rule>, negative: bool },
    /// 为匹配的部分分配标签
    Tagged { id: String, rule: Box<Rule> },
    /// 陷阱规则，用于错误处理
    Trap { id: String, rule: Box<Rule> },
    /// 引用全局变量
    Variable { name: String },
    /// 匹配空白字符
    Whitespace,
    /// 匹配换行符
    Newline,
    /// 匹配空白、换行和注释
    Ignored,
    /// 匹配缩进
    Indent,
    /// 匹配反缩进
    Dedent,
    /// 匹配文件结束
    EndOfFile,
    /// 引用外部自定义解析器
    External { name: String },
}

impl Rule {
    /// 创建一个引用规则
    pub fn rule(name: impl Into<String>) -> Self {
        Self::Rule { name: name.into() }
    }
    
    /// 创建一个字面量规则
    pub fn literal(text: impl Into<String>) -> Self {
        Self::Literal { text: text.into() }
    }
    
    /// 创建一个正则表达式规则
    pub fn regex(regex: impl Into<String>) -> Self {
        Self::Regex { regex: regex.into() }
    }
    
    /// 创建一个序列规则
    pub fn sequence(rules: Vec<Rule>) -> Self {
        Self::Sequence { rules }
    }
    
    /// 创建一个选择规则
    pub fn choice(rules: Vec<Rule>) -> Self {
        Self::Choice { rules }
    }
    
    /// 创建一个重复规则
    pub fn repeats(rule: Rule, min: u32, max: u32) -> Self {
        Self::Repeats { rule: Box::new(rule), min, max }
    }
    
    /// 创建一个可选规则 (0-1)
    pub fn optional(rule: Rule) -> Self {
        Self::repeats(rule, 0, 1)
    }
    
    /// 创建一个零或多个规则 (0-*)
    pub fn zero_or_more(rule: Rule) -> Self {
        Self::repeats(rule, 0, u32::MAX)
    }
    
    /// 创建一个一或多个规则 (1-*)
    pub fn one_or_more(rule: Rule) -> Self {
        Self::repeats(rule, 1, u32::MAX)
    }
    
    /// 创建一个前瞻规则
    pub fn lookahead(rule: Rule, negative: bool) -> Self {
        Self::Lookahead { rule: Box::new(rule), negative }
    }
    
    /// 创建一个正向前瞻规则
    pub fn positive_lookahead(rule: Rule) -> Self {
        Self::lookahead(rule, false)
    }
    
    /// 创建一个负向前瞻规则
    pub fn negative_lookahead(rule: Rule) -> Self {
        Self::lookahead(rule, true)
    }
    
    /// 创建一个带标签的规则
    pub fn tagged(id: impl Into<String>, rule: Rule) -> Self {
        Self::Tagged { id: id.into(), rule: Box::new(rule) }
    }
    
    /// 创建一个陷阱规则
    pub fn trap(id: impl Into<String>, rule: Rule) -> Self {
        Self::Trap { id: id.into(), rule: Box::new(rule) }
    }
    
    /// 创建一个变量规则
    pub fn variable(name: impl Into<String>) -> Self {
        Self::Variable { name: name.into() }
    }
    
    /// 创建一个外部规则
    pub fn external(name: impl Into<String>) -> Self {
        Self::External { name: name.into() }
    }
}

/// 编译后的指令定义
#[derive(Clone, Serialize, Deserialize)]
pub enum Instruction {
    /// 引用另一个规则
    Rule { id: RuleId },
    /// 引用外部自定义解析器
    External { custom: RuleId },
    /// 匹配字面量字符串
    Literal { text: String },
    /// 引用正则表达式规则
    #[serde(with = "serde_fancy_regex")]
    Regex { regex: Regex },
    /// 读取全局变量
    Variable { name: String },
    /// 序列规则，所有部分必须按顺序匹配
    Sequence { rules: Vec<Instruction> },
    /// 选择规则，匹配任意一个部分
    Choice { rules: Vec<Instruction> },
    /// 重复规则，包括可选(0-1)、零或多个(0-u32::MAX)、一或多个(1-u32::MAX)
    Repeats { rule: Box<Instruction>, min: u32, max: u32 },
    /// 前瞻规则，不消耗输入
    Lookahead { rule: Box<Instruction>, negative: bool },
    /// 为匹配的部分分配标签
    Tagged { id: TagId, rule: Box<Instruction> },
    /// 陷阱规则，用于错误处理
    Trap { id: RuleId, rule: Box<Instruction> },
    /// 匹配空白字符
    Whitespace,
    /// 匹配换行符
    Newline,
    /// 匹配空白、换行和注释
    Ignored,
    /// 匹配缩进
    Indent,
    /// 匹配反缩进
    Dedent,
    /// 匹配文件结束
    EndOfFile,
}

impl fmt::Debug for Instruction {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Rule { id } => write!(f, "Rule({})", id),
            Self::External { custom } => write!(f, "External({})", custom),
            Self::Literal { text } => write!(f, "Literal({})", text),
            Self::Regex { regex } => write!(f, "Regex({})", regex),
            Self::Variable { name } => write!(f, "Variable({})", name),
            Self::Sequence { rules } => {
                write!(f, "Sequence(")?;
                for (i, rule) in rules.iter().enumerate() {
                    if i > 0 {
                        write!(f, ", ")?;
                    }
                    write!(f, "{:?}", rule)?;
                }
                write!(f, ")")
            },
            Self::Choice { rules } => {
                write!(f, "Choice(")?;
                for (i, rule) in rules.iter().enumerate() {
                    if i > 0 {
                        write!(f, " | ")?;
                    }
                    write!(f, "{:?}", rule)?;
                }
                write!(f, ")")
            },
            Self::Repeats { rule, min, max } => {
                if *min == 0 && *max == 1 {
                    write!(f, "Optional({:?})", rule)
                } else if *min == 0 && *max == u32::MAX {
                    write!(f, "ZeroOrMore({:?})", rule)
                } else if *min == 1 && *max == u32::MAX {
                    write!(f, "OneOrMore({:?})", rule)
                } else {
                    write!(f, "Repeats({:?}, {}, {})", rule, min, max)
                }
            },
            Self::Lookahead { rule, negative } => {
                if *negative {
                    write!(f, "NegativeLookahead({:?})", rule)
                } else {
                    write!(f, "PositiveLookahead({:?})", rule)
                }
            },
            Self::Tagged { id, rule } => write!(f, "Tagged({}, {:?})", id, rule),
            Self::Trap { id, rule } => write!(f, "Trap({}, {:?})", id, rule),
            Self::Whitespace => write!(f, "Whitespace"),
            Self::Newline => write!(f, "Newline"),
            Self::Ignored => write!(f, "Ignored"),
            Self::Indent => write!(f, "Indent"),
            Self::Dedent => write!(f, "Dedent"),
            Self::EndOfFile => write!(f, "EndOfFile"),
        }
    }
}