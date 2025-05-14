//! 代数效应编译器测试

use vks_compiler::ast::{transform::transform_to_js, VikingProgram};





/// 创建测试用的程序AST
#[test]
fn create_test_program() {
    use vks_compiler::ast::{VikingProgram, VikingStatement, TryHandlerStatement, RaiseStatement, ResumeStatement, HandlerCase};

    // 创建try块中的raise语句
    let try_body = vec![
        VikingStatement::Raise(RaiseStatement::new("use_state", vec![])),
        VikingStatement::Raise(RaiseStatement::new("log_effect", vec![""log effect""])),
        VikingStatement::Raise(RaiseStatement::new("my_error", vec![])),
    ];

    // 创建handler cases
    let handler_cases = vec![
        HandlerCase::new(
            "use_state",
            vec![],
            vec![VikingStatement::Resume(ResumeStatement::new(Some("0")))],
        ),
        HandlerCase::new(
            "log_effect",
            vec!["e"],
            vec![VikingStatement::JsCode("console.log('real log' + e)")],
        ),
        HandlerCase::new(
            "my_error",
            vec![],
            vec![VikingStatement::Raise(RaiseStatement::new("my_error", vec![]))],
        ),
    ];

    // 创建并返回完整的程序AST
    VikingProgram::new(vec![VikingStatement::TryHandler(
        TryHandlerStatement::new(try_body, handler_cases)
    )]);
}

/// 创建带有嵌套处理器的测试程序AST
#[test]
fn create_nested_handlers_program() {
    use vks_compiler::ast::{VikingProgram, VikingStatement, TryHandlerStatement, RaiseStatement, HandlerCase};

    // 创建内层handler cases
    let inner_cases = vec![
        HandlerCase::new(
            "inner_effect",
            vec!["value"],
            vec![VikingStatement::Resume(ResumeStatement::new(Some("value * 3")))],
        ),
        HandlerCase::new(
            "shared_effect",
            vec!["value"],
            vec![VikingStatement::Resume(ResumeStatement::new(Some("value + 5")))],
        ),
    ];

    // 创建外层handler cases
    let outer_cases = vec![
        HandlerCase::new(
            "outer_effect",
            vec!["value"],
            vec![VikingStatement::Resume(ResumeStatement::new(Some("value * 2")))],
        ),
        HandlerCase::new(
            "shared_effect",
            vec!["value"],
            vec![VikingStatement::Resume(ResumeStatement::new(Some("value + 10")))],
        ),
    ];

    // 创建内层try-handler
    let inner_try_handler = VikingStatement::TryHandler(
        TryHandlerStatement::new(
            vec![VikingStatement::Raise(RaiseStatement::new("inner_effect", vec!["3"])),
                 VikingStatement::Raise(RaiseStatement::new("shared_effect", vec!["1"]))],
            inner_cases,
        )
    );

    // 创建外层try-handler
    let outer_try_handler = VikingStatement::TryHandler(
        TryHandlerStatement::new(
            vec![VikingStatement::Raise(RaiseStatement::new("outer_effect", vec!["2"])),
                 inner_try_handler,
                 VikingStatement::Raise(RaiseStatement::new("shared_effect", vec!["2"]))],
            outer_cases,
        )
    );

    // 创建并返回完整的程序AST
    VikingProgram::new(vec![outer_try_handler]);
}