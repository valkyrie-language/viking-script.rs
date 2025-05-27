#[derive(Debug, Clone)]
pub struct ParseResult<T> {
    pub success: bool,
    pub result: Option<T>,
    pub consumed: InputOffset,
    pub errors: Vec<ParseError>,
}

pub enum CompilerError {
    //...
}

#[derive(Debug, Clone)]
pub enum ParseError {
    Unexpected { offset: InputOffset, expected: Vec<String>, message: String },
}
