//! 输入流模块
//!
//! 提供输入流的抽象和实现，支持字符匹配和位置信息。

use std::borrow::Cow;
use std::ops::Range;

mod escaped;

pub use self::escaped::EscapedInputStream;

/// 输入偏移量类型
pub type InputOffset = u64;

/// 输入流 trait，支持字符匹配和位置信息
pub trait InputStream {
    /// 匹配单个字符
    fn match_char(&self, c: char, at: InputOffset) -> Option<InputOffset>;

    /// 匹配字符串
    fn match_str(&self, s: &str, at: InputOffset) -> Option<InputOffset>;

    /// 检查是否到达输入流末尾
    fn match_eof(&self, at: InputOffset) -> bool;

    /// 获取指定范围内容，并转为字符串
    fn view(&self, range: Range<InputOffset>) -> Cow<str>;
}

/// 字符串输入流实现
pub struct StringInputStream<'a> {
    /// 输入字符串
    input: &'a str,
}

impl<'a> StringInputStream<'a> {
    /// 创建一个新的字符串输入流
    pub fn new(input: &'a str) -> Self {
        Self { input }
    }
}

impl<'a> InputStream for StringInputStream<'a> {
    fn match_char(&self, c: char, at: InputOffset) -> Option<InputOffset> {
        let offset = at as usize;
        let slice = self.input.get(offset..)?;
        if slice.starts_with(c) {
            Some(at + c.len_utf8() as InputOffset)
        } else {
            None
        }
    }

    fn match_str(&self, s: &str, at: InputOffset) -> Option<InputOffset> {
        let offset = at as usize;
        let slice = self.input.get(offset..)?;
        if slice.starts_with(s) {
            Some(at + s.len() as InputOffset)
        } else {
            None
        }
    }

    fn match_eof(&self, at: InputOffset) -> bool {
        at as usize >= self.input.len()
    }

    fn view(&self, range: Range<InputOffset>) -> Cow<str> {
        let start = range.start as usize;
        let end = range.end as usize;
        match self.input.get(start..end) {
            Some(s) => Cow::Borrowed(s),
            None => Cow::Borrowed(""),
        }
    }
}

/// UTF-16 字符串输入流实现
pub struct Utf16InputStream {
    /// 输入字符串（UTF-16编码）
    input: Vec<u16>,
    /// UTF-16到UTF-8的偏移映射
    offset_map: Vec<usize>,
}

impl Utf16InputStream {
    /// 创建一个新的UTF-16字符串输入流
    pub fn new(input: Vec<u16>) -> Self {
        let mut offset_map = Vec::with_capacity(input.len() + 1);
        offset_map.push(0);
        
        let mut utf8_len = 0;
        for code_unit in &input {
            let c = char::from_u32(*code_unit as u32).unwrap_or('�');
            utf8_len += c.len_utf8();
            offset_map.push(utf8_len);
        }
        
        Self { input, offset_map }
    }
    
    /// 获取UTF-16位置对应的UTF-8位置
    fn utf16_to_utf8_offset(&self, utf16_offset: usize) -> usize {
        if utf16_offset >= self.offset_map.len() {
            *self.offset_map.last().unwrap_or(&0)
        } else {
            self.offset_map[utf16_offset]
        }
    }
    
    /// 将输入转换为UTF-8字符串
    fn as_utf8_string(&self) -> String {
        String::from_utf16_lossy(&self.input)
    }
}

impl InputStream for Utf16InputStream {
    fn match_char(&self, c: char, at: InputOffset) -> Option<InputOffset> {
        let offset = at as usize;
        if offset >= self.input.len() {
            return None;
        }
        
        let code_unit = self.input[offset];
        let input_char = char::from_u32(code_unit as u32).unwrap_or('�');
        
        if input_char == c {
            // 对于UTF-16，大多数字符是1个code unit，但有些是2个
            let next_offset = if c.len_utf16() > 1 && offset + 1 < self.input.len() {
                offset + 2
            } else {
                offset + 1
            };
            
            Some(next_offset as InputOffset)
        } else {
            None
        }
    }

    fn match_str(&self, s: &str, at: InputOffset) -> Option<InputOffset> {
        let offset = at as usize;
        if offset >= self.input.len() {
            return None;
        }
        
        // 将输入的UTF-16转换为UTF-8字符串进行比较
        let utf8_string = self.as_utf8_string();
        let utf8_offset = self.utf16_to_utf8_offset(offset);
        
        if utf8_string.get(utf8_offset..)?.starts_with(s) {
            // 计算匹配后的新偏移量
            let mut chars_matched = 0;
            let mut current_offset = offset;
            
            for c in s.chars() {
                if current_offset >= self.input.len() {
                    return None;
                }
                
                chars_matched += 1;
                current_offset += c.len_utf16();
            }
            
            Some(current_offset as InputOffset)
        } else {
            None
        }
    }

    fn match_eof(&self, at: InputOffset) -> bool {
        at as usize >= self.input.len()
    }

    fn view(&self, range: Range<InputOffset>) -> Cow<str> {
        let start = range.start as usize;
        let end = range.end as usize;
        
        if start >= self.input.len() || start >= end {
            return Cow::Borrowed("");
        }
        
        let end = end.min(self.input.len());
        let slice = &self.input[start..end];
        
        Cow::Owned(String::from_utf16_lossy(slice))
    }
}