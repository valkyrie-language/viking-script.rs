use arcstr::ArcStr;
use oxc_span::Span;
use std::ops::Range;

pub mod effect;
pub mod program;
pub mod transform;

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
    /// Try块中的语句
    pub try_body: Vec<VikingStatement>,
    /// Handler块中的Case
    pub handler_cases: Vec<crate::ast::effect::EffectCase>,
    /// 源码位置
    pub span: Span,
    /// 所在文件
    pub file: ArcStr,
}
#[derive(Clone, Debug)]
pub struct RaiseStatement {
    /// 效应调用
    pub effect: crate::ast::effect::EffectCall,
    /// 源码位置
    pub span: Span,
    /// 所在文件
    pub file: ArcStr,
}

#[derive(Clone, Debug)]
pub struct ResumeStatement {
    /// 恢复参数
    pub argument: Option<String>,
    /// 源码位置
    pub span: Span,
    /// 所在文件
    pub file: ArcStr,
}
