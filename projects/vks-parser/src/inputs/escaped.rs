//! 转义字符输入流实现
//!
//! 提供对转义字符的处理支持，如\n、\t、\u{xxxx}等。

use std::{borrow::Cow, ops::Range};

use super::{InputOffset, InputStream};

/// 转义字符输入流实现
///
/// 包装另一个输入流，处理转义序列。支持常见的转义字符如\n、\t、\r等，
/// 以及Unicode转义序列\u{xxxx}。
pub struct EscapedInputStream {
    /// 底层输入流
    inner: Box<dyn InputStream>,
    /// 字符缓存
    chars: Vec<(char, Range<InputOffset>)>,
}

pub struct CharacterInputStream {
    /// 底层输入流
    inner: Vec<(char, Range<InputOffset>)>,
}

pub struct EscapedIterator<'i> {
    inner: &'i str,
}

impl EscapedInputStream {
    /// 创建一个新的转义字符输入流
    pub fn new(inner: Box<dyn InputStream>) -> Self {
        let mut stream = Self {
            inner,
            chars: Vec::new(),
        };
        stream.process_escapes();
        stream
    }
    
    /// 处理转义序列
    fn process_escapes(&mut self) {
        // 简化实现，实际应该遍历输入流并处理转义序列
        // 这里只是一个示例实现
    }
    
    /// 解析转义字符
    fn parse_escape(&self, c: char) -> char {
        match c {
            'n' => '\n',
            't' => '\t',
            'r' => '\r',
            '\'' => '\'',
            '"' => '"',
            '\\' => '\\',
            '0' => '\0',
            _ => c,
        }
    }
    
    /// 解析Unicode转义序列
    fn parse_unicode_escape(&self, s: &str) -> Option<char> {
        // 解析\u{XXXX}格式的Unicode转义序列
        if s.starts_with("\\u{") && s.ends_with('}') {
            let hex = &s[3..s.len()-1];
            if let Ok(code) = u32::from_str_radix(hex, 16) {
                return std::char::from_u32(code);
            }
        }
        None
    }
}

impl CharacterInputStream {
    /// 创建一个新的转义字符输入流
    pub fn from_escaped(inner: impl Iterator<Item = (char, Range<InputOffset>)>) -> Self {
        Self { inner: inner.collect() }
    }
}

impl InputStream for EscapedInputStream {
    fn match_char(&self, c: char, at: InputOffset) -> Option<InputOffset> {
        for (char, range) in &self.chars {
            if *char == c && range.start == at {
                return Some(range.end);
            }
        }
        None
    }

    fn match_str(&self, s: &str, at: InputOffset) -> Option<InputOffset> {
        let mut current = at;
        for c in s.chars() {
            match self.match_char(c, current) {
                Some(next) => current = next,
                None => return None,
            }
        }
        Some(current)
    }

    fn match_eof(&self, at: InputOffset) -> bool {
        // 检查是否已经处理完所有字符
        self.chars.iter().all(|(_, range)| range.start < at)
    }

    fn view(&self, range: Range<InputOffset>) -> Cow<str> {
        // 收集指定范围内的字符
        let chars: String = self.chars.iter()
            .filter(|(_, r)| r.start >= range.start && r.start < range.end)
            .map(|(c, _)| *c)
            .collect();
        Cow::Owned(chars)
    }
}

impl InputStream for CharacterInputStream {
    fn match_char(&self, c: char, at: InputOffset) -> Option<InputOffset> {
        for (char, range) in &self.inner {
            if *char == c && range.contains(&at) {
                return Some(range.end);
            }
        }
        None
    }

    fn match_str(&self, s: &str, at: InputOffset) -> Option<InputOffset> {
        todo!()
    }

    fn match_eof(&self, at: InputOffset) -> bool {
        todo!()
    }

    fn view(&self, range: Range<InputOffset>) -> Cow<str> {
        todo!()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::inputs::Utf8InputStream;

    #[test]
    fn test_escaped_char() {
        let input = "\\n\\t\\r\\\\\\'\\0";
        let stream = Utf8InputStream::new(input);
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
        let stream = Utf8InputStream::new(input);
        let escaped = EscapedInputStream::new(stream);

        // 测试匹配Unicode转义序列
        assert_eq!(escaped.match_char('a', 0), Some(6)); // \u{61} -> 'a'
        assert_eq!(escaped.match_char('😀', 6), Some(14)); // \u{1F600} -> '😀'
    }

    #[test]
    fn test_match_str() {
        let input = "Hello\\nWorld\\u{1F600}";
        let stream = Utf8InputStream::new(input);
        let escaped = EscapedInputStream::new(stream);

        // 测试匹配字符串
        assert_eq!(escaped.match_str("Hello\n", 0), Some(7));
        assert_eq!(escaped.match_str("World😀", 7), Some(19));
    }
}
