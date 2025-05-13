//! 代数效应相关的AST节点实现

use arcstr::ArcStr;
use oxc_span::Span;

/// 效应调用表达式
#[derive(Clone, Debug)]
pub struct EffectCall {
    /// 效应名称
    pub name: ArcStr,
    /// 效应参数
    pub arguments: Vec<String>,
    /// 源码位置
    pub span: Span,
    /// 所在文件
    pub file: ArcStr,
}

/// 效应处理器Case
#[derive(Clone, Debug)]
pub struct EffectCase {
    /// 效应名称
    pub effect_name: ArcStr,
    /// 参数列表
    pub parameters: Vec<String>,
    /// Case体
    pub body: Vec<crate::ast::VikingStatement>,
    /// 源码位置
    pub span: Span,
    /// 所在文件
    pub file: ArcStr,
}

impl EffectCall {
    /// 创建新的效应调用
    pub fn new(name: ArcStr, arguments: Vec<String>, span: Span, file: ArcStr) -> Self {
        Self {
            name,
            arguments,
            span,
            file,
        }
    }

    /// 获取效应名称
    pub fn name(&self) -> &str {
        &self.name
    }

    /// 获取效应参数
    pub fn arguments(&self) -> &[String] {
        &self.arguments
    }
}

impl EffectCase {
    /// 创建新的效应处理器Case
    pub fn new(
        effect_name: ArcStr,
        parameters: Vec<String>,
        body: Vec<crate::ast::VikingStatement>,
        span: Span,
        file: ArcStr,
    ) -> Self {
        Self {
            effect_name,
            parameters,
            body,
            span,
            file,
        }
    }

    /// 获取效应名称
    pub fn effect_name(&self) -> &str {
        &self.effect_name
    }

    /// 获取参数列表
    pub fn parameters(&self) -> &[String] {
        &self.parameters
    }

    /// 获取Case体
    pub fn body(&self) -> &[crate::ast::VikingStatement] {
        &self.body
    }
}