use super::*;

/// 字符串输入流实现
pub struct Utf8InputStream<'a> {
    /// 输入字符串
    input: &'a str,
}

impl<'a> Utf8InputStream<'a> {
    /// 创建一个新的字符串输入流
    pub fn new(input: &'a str) -> Self {
        Self { input }
    }
}

impl<'a> InputStream for Utf8InputStream<'a> {
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