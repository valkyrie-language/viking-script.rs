use super::*;


/// UTF-16 字符串输入流实现
pub struct Utf16InputStream {
    /// 输入字符串（UTF-16编码）
    input: Vec<u16>,
}

impl Utf16InputStream {
    /// 创建一个新的UTF-16字符串输入流
    pub fn new(input: Vec<u16>) -> Self {
        Self {
            input,
        }
    }
}

impl InputStream for Utf16InputStream {
    fn match_char(&self, c: char, at: InputOffset) -> Option<InputOffset> {
        todo!()
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
