使用 rust, 实现一个增量式 peg 解析库, 

## 要求

使用 GrammarBuilder 构建语法, 上层为 rule, 通过编译转为下层指令

```rust
use std::collections::BTreeMap;

pub struct GrammarBuilder {
    //...
}
pub struct GrammarInfo {
    config: GrammarConfig,
    // ...
}

pub struct GrammarConfig {
    variables: BTreeMapMap<String, String>,
    tab_as_space: u32,
    // ...
}

impl Default for GrammarConfig {
    fn default() -> Self {
        Self {
            variables: BTreeMapMap::new(),
            tab_as_space: 4,
        }
    }
}

/// Represents a part of a rule during building
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Rule {
    /// Reference to another rule by name
    Rule { name: String },
    /// Literal string to match, e.g., "+", "keyword"
    Literal { text: String },
    /// Reference to a regex rule by name
    Regex { regex: String },
    //...
}

// Compiled Rule Definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Instruction {
    /// Reference to another rule by ID
    Rule { id: RuleId },
    /// Reference the external custom parser
    External { custom: RuleId },
    /// Literal string to match
    Literal { text: String },
    /// Reference to a regex rule by ID
    #[serde(with = "serde_fancy_regex")]
    Regex { regex: fancy_regex::Regex },
    /// Read global variable from config
    Variable { name: String },
    /// Sequence of parts, all must match in order
    Sequence { rules: Vec<Instruction> },
    Choice { rules: Vec<Instruction> },
    /// Repetition of a part, including optional (0-1), zero-or-more(0-u32::Max), one-or-more(0-u32::Max)
    Repeats { rule: Box<Instruction>, min: u32, max: u32 },
    Lookahead { rule: Box<Instruction>, negative: bool },
    /// Assigns a tag to the resulting node if this part matches
    Tagged { id: TagId, rule: Box<Instruction> },
    /// Compiled regex
    Trap { id: RuleId, rule: Box<Instruction> },
    /// A special rule that matches whitespace (user overrideable `WHITE_SPACE`)
    Whitespace,
    /// A special rule that matches newline (user overrideable `NEW_LINE`)
    Newline,
    /// A special rule that matches whitespace + newline + comments (user overrideable `IGNORED`)
    Ignored,
    /// a special rule for visual indentation
    Indent,
    /// a special rule for visual dedentation
    Dedent,
    /// a special rule matching end of file
    EndOfFile,
}
```

serde_fancy_regex 是一个库, 你无需实现

## 特性

支持缩进文法

支持增量解析

支持手动记忆化

支持定义规则 (grammar.add_rule)

支持注册自定义解析函数 (grammar.add_custom_rule)

```rust
pub type CustomParser = Box<dyn Fn(&mut ParserState, InputOffset) -> ParseResult<InputOffset>>;
```

支持特殊的 expression 规则 (grammar.add_pratt_rule), 使用 pratt parser 即可 (不要调用库), 除此以外没有其他左递归的情况

支持配置解析器全局变量 (grammar.add_variable), 比如模板解析设置成 '<%' 和 '%>', 有人会希望自定义 '{%' 和 '%}'

支持 pin rule, 一旦解析成功, 不再尝试其他分支

支持 trap rule 提前终止和使用 recover token 恢复解析, 也就是单次解析, 多错误返回而非直接终止

解析结果为红绿树, 红绿树从外置的红绿树节点池复用节点来提高分配速度

```rust
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct NodePool {
    green_pool: Vec<GreenData>,
    green_unused: Vec<usize>
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct GreenData {
    /// language id
    language: u32,
    /// node kind
    kind: u32,
    /// tag id
    tag: u32,
    /// total text length
    length: u32,
    /// children if not leaf, leaf has no children
    children: Vec<u32>,
}

#[derive(Copy, Clone, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct GreenNode {
    /// The node index in the green pool
    node_id: u32,
}
```

不需要保存文本, 有了红绿树的 offset 以后, 文本使用 InputStream::view 即可获取

附带位置信息(offset), 以及标记信息, 比如 expr ::= lhs:expr '+' rhs:expr | atom, 左侧 expr 是自定义规则, lhs, rhs 是 tag, expr 是 kind, mark = hash(language, kind, tag) 后的 u64

虽然语法上都可以加 tag, 但 tag 实际上只对 atomic token (比如 tag:item)或者 1st level choice (a ::= add: (b+c) | sub: (b-c)) 有意义.

## 输入

输入是一个 impl InputStream, 支持 match_char, match_str 之类的操作, 返回结束位置的 offset.
具体来说可以是一个 &str, 字符 宽度 1, 也可能是 utf16str, 字符 宽度 2, 或者一个转义后的 char \u{xxxx}, 字符宽度 8, 这样的话同样的 char, 实际上宽度是不一样的,

```rust
pub type InputOffset = u64;

/// 输入流 trait，支持字符匹配和位置信息
pub trait InputStream {
    /// 匹配单个字符
    fn match_char(&self, c: char, at: InputOffset) -> Option<InputOffset>;

    /// 匹配字符串
    fn match_str(&self, s: &str, at: InputOffset) -> Option<InputOffset>;

    /// 检查是否到达输入流末尾
    fn match_eof(&self, at: InputOffset) -> bool;

    /// 获取指定范围内容, 并转为字符串
    fn view(&self, range: Range<InputOffset>) -> Cow<str>;
    
    fn indentation(&self, at: InputOffset, config: GrammarConfig) -> u32;
}



impl<'a> InputStream for &'a str {
    fn match_char(&self, c: char, at: InputOffset) -> Option<InputOffset> {
        let offset = at as usize;
        let slice = self.get(offset..)?;
        if slice.starts_with(c) { Some(at + c.len_utf8() as InputOffset) } else { None }
    }

    fn match_str(&self, s: &str, at: InputOffset) -> Option<InputOffset> {
        let offset = at as usize;
        let slice = self.get(offset..)?;
        if slice.starts_with(s) { Some(at + s.len() as InputOffset) } else { None }
    }

    fn match_eof(&self, at: InputOffset) -> bool {
        at as usize >= self.len()
    }

    fn view(&self, range: Range<InputOffset>) -> Cow<str> {
        let start = range.start as usize;
        let end = range.end as usize;
        match self.get(start..end) {
            Some(s) => Cow::Borrowed(s),
            None => Cow::Borrowed(""),
        }
    }
}
```

input stream 要能正确处理这种情况.

## 错误处理

错误分为 parse error(runtime error) 和 compiler error

不要用 this error 库里的宏生成

## 测试

最后需要 json5 和简易的 yaml 的解析器作为验证
还要写一个支持 f32 的加减乘除幂, 括号的计算器 demo, 都放在 tests 