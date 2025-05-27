use std::borrow::Cow;
use std::ops::Range;
use crate::grammar::GrammarConfig;
use crate::inputs::{InputOffset, InputStream};

impl<'a> InputStream for &'a str {
    fn peek_char(&self, at: InputOffset) -> Option<(char, Range<InputOffset>)> {
        todo!()
    }

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

    fn indentation(&self, at: InputOffset, config: GrammarConfig) -> u32 {
        todo!()
    }
}
