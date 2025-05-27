use std::borrow::Cow;
use crate::grammar::GrammarConfig;
use std::ops::Range;

mod utf8;
mod utf16;
mod escaped;

pub type InputOffset = u32;

/// 输入流 trait，支持字符匹配和位置信息

pub trait InputStream {
    fn peek_char(&self, at: InputOffset) -> Option<(char, Range<InputOffset>)>;

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
