//! 程序AST节点实现

use arcstr::ArcStr;
use oxc_span::Span;
use crate::ast::{VikingStatement, TryHandlerStatement, RaiseStatement, ResumeStatement};

/// Viking程序AST实现
impl crate::ast::VikingProgram {
    /// 创建新的程序
    pub fn new(statements: Vec<VikingStatement>, span: Span, file: ArcStr) -> Self {
        Self {
            statements,
            span,
            file,
        }
    }

    /// 获取所有语句
    pub fn statements(&self) -> &[VikingStatement] {
        &self.statements
    }

    /// 获取源码位置
    pub fn span(&self) -> Span {
        self.span
    }

    /// 获取文件路径
    pub fn file(&self) -> &ArcStr {
        &self.file
    }
}

/// Try-Handler语句实现
impl TryHandlerStatement {
    /// 创建新的Try-Handler语句
    pub fn new(try_body: Vec<VikingStatement>, handler_cases: Vec<crate::ast::effect::EffectCase>, span: Span, file: ArcStr) -> Self {
        Self {
            try_body,
            handler_cases,
            span,
            file,
        }
    }

    /// 获取Try块体
    pub fn try_body(&self) -> &[VikingStatement] {
        &self.try_body
    }

    /// 获取Handler块的所有Case
    pub fn handler_cases(&self) -> &[crate::ast::effect::EffectCase] {
        &self.handler_cases
    }
}

/// Raise语句实现
impl RaiseStatement {
    /// 创建新的Raise语句
    pub fn new(effect: crate::ast::effect::EffectCall, span: Span, file: ArcStr) -> Self {
        Self {
            effect,
            span,
            file,
        }
    }

    /// 获取效应名称
    pub fn effect_name(&self) -> &str {
        self.effect.name()
    }

    /// 获取效应参数
    pub fn arguments(&self) -> &[String] {
        self.effect.arguments()
    }
}

/// Resume语句实现
impl ResumeStatement {
    /// 创建新的Resume语句
    pub fn new(argument: Option<String>, span: Span, file: ArcStr) -> Self {
        Self {
            argument,
            span,
            file,
        }
    }

    /// 获取恢复参数
    pub fn argument(&self) -> Option<&str> {
        self.argument.as_deref()
    }
}