use crate::inputs::{InputOffset, InputStream};
use crate::tree::{ParseResult, ParserState};

pub struct ParserState<'a> {
    parser: &'a mut Parser,
    input: &'a dyn InputStream,
    indent_stack: Vec<u32>,
    errors: Vec<ParseError>,
    trapped_errors: Vec<ParseError>,
}