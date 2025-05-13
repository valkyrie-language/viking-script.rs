use arcstr::ArcStr;
use oxc_span::Span;
use std::ops::Range;

pub struct VikingProgram {
    statements: Vec<VikingStatement>,
    span: Span,
    file: ArcStr,
}

pub enum VikingStatement {}
