use arcstr::ArcStr;
use oxc_span::Span;
use std::ops::Range;


#[derive(Clone, Debug)]
pub struct VikingProgram {
    statements: Vec<VikingStatement>,
    span: Span,
    file: ArcStr,
}
#[derive(Clone, Debug)]
pub enum VikingStatement {
    TryHandler(TryHandlerStatement),
    Raise(RaiseStatement),
    Resume(ResumeStatement),
}

#[derive(Clone, Debug)]
pub struct TryHandlerStatement {
    span: Span,
    file: ArcStr,
}
#[derive(Clone, Debug)]
pub struct RaiseStatement {
    span: Span,
    file: ArcStr,
}

#[derive(Clone, Debug)]
pub struct ResumeStatement {
    span: Span,
    file: ArcStr,
}