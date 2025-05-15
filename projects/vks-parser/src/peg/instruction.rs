use std::borrow::Cow;
use std::ops::Range;

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


    fn column(&self, at: InputOffset, tab_width: u32) -> u32 {
        
    }
}

pub struct 


