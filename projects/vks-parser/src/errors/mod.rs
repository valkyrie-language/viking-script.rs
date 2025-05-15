use crate::inputs::InputOffset;
use crate::instruction::RuleId;
use std::fmt;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CompileErrorKind {
    UndefinedRule(String),
    InvalidRegex(String),
    PrattError(String),
    DuplicateRuleName(String),
    DuplicateTagName(String),
    DuplicateVariableName(String),
    DuplicateCustomRuleName(String),
    // ... other compilation errors
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CompileError {
    pub kind: CompileErrorKind,
    pub message: String,
}

impl fmt::Display for CompileError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Compilation Error: {:?} - {}", self.kind, self.message)
    }
}
impl std::error::Error for CompileError {}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum IndentErrorKind {
    NotGreater, // For Indent instruction: new_indent <= current_indent
    NotLess,    // For Dedent instruction: new_indent >= current_indent
    NonAligned, // For Dedent: new_indent is not a previous indent level in stack based model
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ParseErrorKind {
    LiteralMismatch {
        expected: String,
        found: String, // Or just the position
        at: InputOffset,
    },
    RegexMismatch {
        expected_pattern: String,
        at: InputOffset,
    },
    RuleMismatch {
        rule_id: RuleId, // Rule that was expected to match
        at: InputOffset,
    },
    ExternalRuleMismatch {
        custom_id: RuleId,
        at: InputOffset,
    },
    EndOfFileExpected { // Expected EOF, but found more inputs
        at: InputOffset,
    },
    UnexpectedEOF { // Expected more inputs, but found EOF
        at: InputOffset,
        // expected: Option<String>, // What was expected
    },
    CustomMessage { // For errors from custom parsers or specific logic
        message: String,
        at: InputOffset,
    },
    ChoiceFailure { // All choices failed for a Choice instruction
        at: InputOffset,
        // last_error: Option<Box<ParseError>>, // Keep track of the furthest errors in choices
    },
    NegativeLookaheadFailed { // Negative lookahead matched (undesired)
        at: InputOffset,
    },
    PositiveLookaheadFailed { // Positive lookahead did not match
        at: InputOffset,
    },
    IndentationError {
        // expected: u32, // This might be dynamic (e.g. "> current")
        // found: u32,
        at: InputOffset,
        kind: IndentErrorKind,
    },
    PinnedRuleFailed { // A pinned rule failed, stopping alternatives
        rule_id: Option<RuleId>, // If the pinned rule has an ID
        at: InputOffset,
    },
    TrapTriggered { // Error explicitly caught by a Trap instruction
        trap_id: RuleId, // ID from the Trap instruction
        at: InputOffset,
        underlying_error: Option<Box<ParseError>>,
    },
    VariableNotFound {
        name: String,
        at: InputOffset,
    },
    PrattParseError {
        message: String,
        at: InputOffset,
    },
    Generic { message: String, at: InputOffset },
    MaxRepetitionReached { at: InputOffset },
    MinRepetitionNotMet { at: InputOffset },
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ParseError {
    pub kind: ParseErrorKind,
    // Consider adding a span (Range<InputOffset>) if useful
}

impl ParseError {
    pub fn new(kind: ParseErrorKind) -> Self {
        Self { kind }
    }
    // Helper constructors
    pub fn literal_mismatch(expected: String, found: String, at: InputOffset) -> Self {
        Self::new(ParseErrorKind::LiteralMismatch { expected, found, at })
    }
    pub fn regex_mismatch(expected_pattern: String, at: InputOffset) -> Self {
        Self::new(ParseErrorKind::RegexMismatch { expected_pattern, at })
    }
    pub fn unexpected_eof(at: InputOffset) -> Self {
        Self::new(ParseErrorKind::UnexpectedEOF { at })
    }
    pub fn choice_failure(at: InputOffset) -> Self {
        Self::new(ParseErrorKind::ChoiceFailure { at })
    }
    pub fn generic(message: String, at: InputOffset) -> Self {
        Self::new(ParseErrorKind::Generic { message, at })
    }
}


impl fmt::Display for ParseError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Parse Error: {:?}", self.kind) // Basic display
    }
}
impl std::error::Error for ParseError {}

// The main result type for a parsing function trying to match one instruction/rule.
// On success: (new_offset, optional_green_node_index, optional_tag_id)
// On failure: ParseError
// Recovered errors are stored in ParserState.errors
pub type ParseResult<T> = Result<T, ParseError>;
