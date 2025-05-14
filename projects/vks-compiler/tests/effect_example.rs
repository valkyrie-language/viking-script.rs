//! 代数效应编译器示例
//! 展示如何将Viking Script语法转换为JavaScript代码

use vks_compiler::ast::{VikingProgram, VikingStatement, TryHandlerStatement, RaiseStatement, ResumeStatement};
use vks_compiler::ast::effect::{EffectCall, EffectCase};
use vks_compiler::compile_to_js;
use arcstr::ArcStr;
use oxc_span::Span;

/// 创建一个简单的Viking程序AST
fn create_sample_program() -> VikingProgram {
    // 创建一个文件名
    let file = ArcStr::from("example.vks");
    
    // 创建效应调用
    let use_state_effect = EffectCall::new(
        ArcStr::from("useState"),
        vec![],
        Span::new(0, 0),
        file.clone(),
    );
    
    let log_effect = EffectCall::new(
        ArcStr::from("logEffect"),
        vec!["\"log effect\"".to_string()],
        Span::new(0, 0),
        file.clone(),
    );
    
    let my_error_effect = EffectCall::new(
        ArcStr::from("myError"),
        vec![],
        Span::new(0, 0),
        file.clone(),
    );
    
    // 创建try块中的语句
    let try_body = vec![
        VikingStatement::Raise(RaiseStatement {
            effect: use_state_effect.clone(),
            span: Span::new(0, 0),
            file: file.clone(),
        }),
        VikingStatement::Raise(RaiseStatement {
            effect: log_effect.clone(),
            span: Span::new(0, 0),
            file: file.clone(),
        }),
        VikingStatement::Raise(RaiseStatement {
            effect: my_error_effect.clone(),
            span: Span::new(0, 0),
            file: file.clone(),
        }),
    ];
    
    // 创建handler块中的case
    let handler_cases = vec![
        EffectCase {
            effect_name: ArcStr::from("useState"),
            parameters: vec![],
            body: vec![VikingStatement::Resume(ResumeStatement {
                argument: Some("0".to_string()),
                span: Span::new(0, 0),
                file: file.clone(),
            })],
            span: Span::new(0, 0),
            file: file.clone(),
        },
        EffectCase {
            effect_name: ArcStr::from("logEffect"),
            parameters: vec!["e".to_string()],
            body: vec![VikingStatement::Raise(RaiseStatement {
                effect: EffectCall::new(
                    ArcStr::from("console.log"),
                    vec!["'real log' + e".to_string()],
                    Span::new(0, 0),
                    file.clone(),
                ),
                span: Span::new(0, 0),
                file: file.clone(),
            })],
            span: Span::new(0, 0),
            file: file.clone(),
        },
        EffectCase {
            effect_name: ArcStr::from("myError"),
            parameters: vec![],
            body: vec![VikingStatement::Raise(RaiseStatement {
                effect: my_error_effect.clone(),
                span: Span::new(0, 0),
                file: file.clone(),
            })],
            span: Span::new(0, 0),
            file: file.clone(),
        },
    ];
    
    // 创建try-handler语句
    let try_handler = TryHandlerStatement {
        try_body,
        handler_cases,
        span: Span::new(0, 0),
        file: file.clone(),
    };
    
    // 创建程序
    VikingProgram {
        statements: vec![VikingStatement::TryHandler(try_handler)],
        span: Span::new(0, 0),
        file,
    }
}

#[test]
fn test_compile_viking_script() {
    let program = create_sample_program();
    let js_code = compile_to_js(&program);
    
    println!("生成的JavaScript代码:\n{}", js_code);
    
    // 这里可以添加断言来验证生成的代码是否符合预期
    assert!(js_code.contains("createEffect"));
    assert!(js_code.contains("runWithEffects"));
    assert!(js_code.contains("yield useState()"));
}

/// 主函数，用于手动测试
#[allow(dead_code)]
fn main() {
    let program = create_sample_program();
    let js_code = compile_to_js(&program);
    
    println!("生成的JavaScript代码:\n{}", js_code);
}