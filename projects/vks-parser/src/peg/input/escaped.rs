//! 转义字符输入流实现
//!
//! 提供对转义字符的处理支持，如\n、\t、\u{xxxx}等。

use std::borrow::Cow;
use std::ops::Range;

use super::{InputStream, InputOffset};

/// 转义字符输入流实现
/// 
/// 包装另一个输入流，处理转义序列。支持常见的转义字符如\n、\t、\r等，
/// 以及Unicode转义序列\u{xxxx}。
pub struct EscapedInputStream<I: InputStream> {
    /// 底层输入流
    inner: I,
    /// 转义字符前缀
    escape_char: char,
    /// 是否启用Unicode转义序列
    enable_unicode_escape: bool,
}

impl<I: InputStream> EscapedInputStream<I> {
    /// 创建一个新的转义字符输入流
    pub fn new(inner: I) -> Self {
        Self {
            inner,
            escape_char: '\\',
            enable_unicode_escape: true,
        }
    }

    /// 创建一个新的转义字符输入流，使用自定义转义字符
    pub fn with_escape_char(inner: I, escape_char: char) -> Self {
        Self {
            inner,
            escape_char,
            enable_unicode_escape: true,
        }
    }

    /// 设置是否启用Unicode转义序列
    pub fn set_enable_unicode_escape(&mut self, enable: bool) {
        self.enable_unicode_escape = enable;
    }

    /// 解析转义字符
    fn parse_escape(&self, at: InputOffset) -> Option<(char, InputOffset)> {
        // 首先匹配转义字符前缀
        let next_offset = self.inner.match_char(self.escape_char, at)?;
        
        // 然后匹配转义字符
        if let Some(next_offset) = self.inner.match_char('n', next_offset) {
            return Some(('\n', next_offset));
        } else if let Some(next_offset) = self.inner.match_char('r', next_offset) {
            return Some(('\r', next_offset));
        } else if let Some(next_offset) = self.inner.match_char('t', next_offset) {
            return Some(('\t', next_offset));
        } else if let Some(next_offset) = self.inner.match_char('\\', next_offset) {
            return Some(('\\', next_offset));
        } else if let Some(next_offset) = self.inner.match_char('"', next_offset) {
            return Some('"', next_offset);
        } else if let Some(next_offset) = self.inner.match_char('\'', next_offset) {
            return Some('\'', next_offset);
        } else if let Some(next_offset) = self.inner.match_char('0', next_offset) {
            return Some('\0', next_offset);
        } else if self.enable_unicode_escape {
            // 处理Unicode转义序列 \u{xxxx}
            if let Some(mut next_offset) = self.inner.match_char('u', next_offset) {
                if let Some(brace_offset) = self.inner.match_char('{', next_offset) {
                    // 读取大括号内的十六进制数字
                    let mut hex_value = 0u32;
                    let mut digit_count = 0;
                    next_offset = brace_offset;
                    
                    // 最多读取6个十六进制数字
                    while digit_count < 6 {
                        let mut found_digit = false;
                        
                        // 尝试匹配十六进制数字
                        for digit in "0123456789abcdefABCDEF".chars() {
                            if let Some(digit_offset) = self.inner.match_char(digit, next_offset) {
                                let digit_value = match digit {
                                    '0'..='9' => digit as u32 - '0' as u32,
                                    'a'..='f' => digit as u32 - 'a' as u32 + 10,
                                    'A'..='F' => digit as u32 - 'A' as u32 + 10,
                                    _ => unreachable!(),
                                };
                                
                                hex_value = hex_value * 16 + digit_value;
                                next_offset = digit_offset;
                                digit_count += 1;
                                found_digit = true;
                                break;
                            }
                        }
                        
                        if !found_digit {
                            break;
                        }
                    }
                    
                    // 匹配结束大括号
                    if let Some(end_offset) = self.inner.match_char('}', next_offset) {
                        // 将十六进制值转换为字符
                        if let Some(c) = char::from_u32(hex_value) {
                            return Some((c, end_offset));
                        }
                    }
                }
            }
        }
        
        // 如果没有匹配到有效的转义序列，则返回转义字符本身
        Some((self.escape_char, next_offset))
    }
}

impl<I: InputStream> InputStream for EscapedInputStream<I> {
    fn match_char(&self, c: char, at: InputOffset) -> Option<InputOffset> {
        // 检查当前位置是否是转义字符
        if let Some(escape_offset) = self.inner.match_char(self.escape_char, at) {
            // 解析转义字符
            if let Some((escaped_char, next_offset)) = self.parse_escape(at) {
                // 如果转义后的字符匹配目标字符，则返回下一个偏移量
                if escaped_char == c {
                    return Some(next_offset);
                }
            }
            // 如果转义字符不匹配，则回退并尝试直接匹配
        }
        
        // 直接匹配字符
        self.inner.match_char(c, at)
    }

    fn match_str(&self, s: &str, at: InputOffset) -> Option<InputOffset> {
        // 对于字符串匹配，我们需要逐字符匹配
        let mut current_offset = at;
        
        for c in s.chars() {
            // 尝试匹配每个字符
            if let Some(next_offset) = self.match_char(c, current_offset) {
                current_offset = next_offset;
            } else {
                return None;
            }
        }
        
        Some(current_offset)
    }

    fn match_eof(&self, at: InputOffset) -> bool {
        self.inner.match_eof(at)
    }

    fn view(&self, range: Range<InputOffset>) -> Cow<str> {
        // 对于视图操作，我们直接委托给内部输入流
        // 注意：这不会解析转义序列，只是返回原始文本
        self.inner.view(range)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::peg::input::StringInputStream;

    #[test]
    fn test_escaped_char() {
        let input = "\\n\\t\\r\\\\\\'\\0";
        let stream = StringInputStream::new(input);
        let escaped = EscapedInputStream::new(stream);
        
        // 测试匹配转义字符
        assert_eq!(escaped.match_char('\n', 0), Some(2));
        assert_eq!(escaped.match_char('\t', 2), Some(4));
        assert_eq!(escaped.match_char('\r', 4), Some(6));
        assert_eq!(escaped.match_char('\\', 6), Some(8));
        assert_eq!(escaped.match_char('"', 8), Some(10));
        assert_eq!(escaped.match_char('\'', 10), Some(12));
        assert_eq!(escaped.match_char('\0', 12), Some(14));
    }

    #[test]
    fn test_unicode_escape() {
        let input = "\\u{61}\\u{1F600}";
        let stream = StringInputStream::new(input);
        let escaped = EscapedInputStream::new(stream);
        
        // 测试匹配Unicode转义序列
        assert_eq!(escaped.match_char('a', 0), Some(6)); // \u{61} -> 'a'
        assert_eq!(escaped.match_char('😀', 6), Some(14)); // \u{1F600} -> '😀'
    }

    #[test]
    fn test_match_str() {
        let input = "Hello\\nWorld\\u{1F600}";
        let stream = StringInputStream::new(input);
        let escaped = EscapedInputStream::new(stream);
        
        // 测试匹配字符串
        assert_eq!(escaped.match_str("Hello\n", 0), Some(7));
        assert_eq!(escaped.match_str("World😀", 7), Some(19));
    }
}