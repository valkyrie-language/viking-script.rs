//! 输入流处理模块
//!
//! 提供了处理不同类型输入流的trait和实现，支持字符匹配和位置信息。

use std::ops::Range;

/// 输入流trait，支持字符匹配和位置信息
pub trait InputStream {
    /// 匹配单个字符，返回匹配成功的位置范围
    fn match_char(&self, offset: usize, c: char) -> Option<Range<usize>>;
    
    /// 匹配字符串，返回匹配成功的位置范围
    fn match_str(&self, offset: usize, s: &str) -> Option<Range<usize>>;
    
    /// 获取指定位置的字符
    fn char_at(&self, offset: usize) -> Option<char>;
    
    /// 获取输入流的长度
    fn len(&self) -> usize;
    
    /// 检查输入流是否为空
    fn is_empty(&self) -> bool {
        self.len() == 0
    }
    
    /// 获取指定范围的子串
    fn slice(&self, range: Range<usize>) -> String;
    
    /// 检查是否到达输入流末尾
    fn is_eof(&self, offset: usize) -> bool {
        offset >= self.len()
    }
}

/// 字符串输入流实现
pub struct StringInputStream<'a> {
    input: &'a str,
    chars: Vec<(usize, char)>, // (offset, char)
}

impl<'a> StringInputStream<'a> {
    /// 创建新的字符串输入流
    pub fn new(input: &'a str) -> Self {
        let chars = input.char_indices().collect();
        Self { input, chars }
    }
}

impl<'a> InputStream for StringInputStream<'a> {
    fn match_char(&self, offset: usize, c: char) -> Option<Range<usize>> {
        if offset >= self.chars.len() {
            return None;
        }
        
        let (start, ch) = self.chars[offset];
        if ch == c {
            let end = if offset + 1 < self.chars.len() {
                self.chars[offset + 1].0
            } else {
                self.input.len()
            };
            Some(start..end)
        } else {
            None
        }
    }
    
    fn match_str(&self, offset: usize, s: &str) -> Option<Range<usize>> {
        if offset >= self.chars.len() {
            return None;
        }
        
        let start = self.chars[offset].0;
        let mut s_chars = s.chars();
        let mut current = offset;
        
        // 尝试匹配每个字符
        while let (Some(expected), Some((_, actual))) = (s_chars.next(), self.chars.get(current)) {
            if *actual != expected {
                return None;
            }
            current += 1;
        }
        
        // 检查是否完全匹配
        if s_chars.next().is_some() {
            return None;
        }
        
        let end = if current < self.chars.len() {
            self.chars[current].0
        } else {
            self.input.len()
        };
        
        Some(start..end)
    }
    
    fn char_at(&self, offset: usize) -> Option<char> {
        self.chars.get(offset).map(|(_, c)| *c)
    }
    
    fn len(&self) -> usize {
        self.chars.len()
    }
    
    fn slice(&self, range: Range<usize>) -> String {
        if range.start >= self.chars.len() {
            return String::new();
        }
        
        let start = self.chars[range.start].0;
        let end = if range.end < self.chars.len() {
            self.chars[range.end].0
        } else {
            self.input.len()
        };
        
        self.input[start..end].to_string()
    }
}

/// UTF-16字符串输入流实现
pub struct Utf16InputStream {
    input: Vec<u16>,
    chars: Vec<(usize, char)>, // (offset, char)
}

impl Utf16InputStream {
    /// 从UTF-16编码的字符串创建输入流
    pub fn new(input: Vec<u16>) -> Self {
        let mut chars = Vec::new();
        let mut i = 0;
        
        while i < input.len() {
            let c = if i + 1 < input.len() && (input[i] & 0xFC00) == 0xD800 && (input[i + 1] & 0xFC00) == 0xDC00 {
                // 处理代理对
                let high = (input[i] & 0x3FF) as u32;
                let low = (input[i + 1] & 0x3FF) as u32;
                let code_point = (high << 10) + low + 0x10000;
                let c = char::from_u32(code_point).unwrap_or('�');
                i += 2;
                c
            } else {
                // 处理单个码元
                let c = char::from_u32(input[i] as u32).unwrap_or('�');
                i += 1;
                c
            };
            
            chars.push((i - (if c.len_utf16() == 2 { 2 } else { 1 }), c));
        }
        
        Self { input, chars }
    }
}

impl InputStream for Utf16InputStream {
    fn match_char(&self, offset: usize, c: char) -> Option<Range<usize>> {
        if offset >= self.chars.len() {
            return None;
        }
        
        let (start, ch) = self.chars[offset];
        if ch == c {
            let end = if offset + 1 < self.chars.len() {
                self.chars[offset + 1].0
            } else {
                self.input.len()
            };
            Some(start..end)
        } else {
            None
        }
    }
    
    fn match_str(&self, offset: usize, s: &str) -> Option<Range<usize>> {
        if offset >= self.chars.len() {
            return None;
        }
        
        let start = self.chars[offset].0;
        let mut s_chars = s.chars();
        let mut current = offset;
        
        // 尝试匹配每个字符
        while let (Some(expected), Some((_, actual))) = (s_chars.next(), self.chars.get(current)) {
            if *actual != expected {
                return None;
            }
            current += 1;
        }
        
        // 检查是否完全匹配
        if s_chars.next().is_some() {
            return None;
        }
        
        let end = if current < self.chars.len() {
            self.chars[current].0
        } else {
            self.input.len() * 2 // UTF-16每个码元占2字节
        };
        
        Some(start..end)
    }
    
    fn char_at(&self, offset: usize) -> Option<char> {
        self.chars.get(offset).map(|(_, c)| *c)
    }
    
    fn len(&self) -> usize {
        self.chars.len()
    }
    
    fn slice(&self, range: Range<usize>) -> String {
        if range.start >= self.chars.len() {
            return String::new();
        }
        
        let start_idx = self.chars[range.start].0;
        let end_idx = if range.end < self.chars.len() {
            self.chars[range.end].0
        } else {
            self.input.len()
        };
        
        String::from_utf16_lossy(&self.input[start_idx..end_idx])
    }
}