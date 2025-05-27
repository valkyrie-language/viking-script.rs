use std::borrow::Cow;
use std::collections::BTreeMap;
use crate::inputs::{InputOffset, InputStream};
use std::ops::Range;
use crate::grammar::GrammarConfig;

pub struct EscapedStream {
    text: BTreeMap<InputOffset, EscapedChar>,
}

pub struct EscapedChar {
    codepoint: char,
    start: InputOffset,
    end: InputOffset,
}

impl InputStream for EscapedStream {
    fn peek_char(&self, at: InputOffset) -> Option<(char, Range<InputOffset>)> {
        todo!()
    }

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

    fn indentation(&self, at: InputOffset, config: GrammarConfig) -> u32 {
        todo!()
    }
}