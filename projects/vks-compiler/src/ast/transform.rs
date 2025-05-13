//! AST转换模块，将代数效应语法转换为JavaScript代码

use crate::ast::{RaiseStatement, ResumeStatement, TryHandlerStatement, VikingProgram, VikingStatement};
use arcstr::ArcStr;

/// 将Viking脚本AST转换为JavaScript代码
pub fn transform_to_js(program: &VikingProgram) -> String {
    let mut output = String::new();

    // 导入运行时
    output.push_str("import { createHandler, runWithHandler, raise } from '@vks/runtime';\n\n");

    // 转换程序体
    transform_program(program, &mut output);

    output
}

/// 转换程序
fn transform_program(program: &VikingProgram, output: &mut String) {
    // 获取所有语句
    let statements = program.statements();

    // 查找try-handler块
    for statement in statements {
        match statement {
            VikingStatement::TryHandler(try_handler) => {
                transform_try_handler(try_handler, output);
            }
            _ => {
                // 其他顶层语句处理
            }
        }
    }
}

/// 转换try-handler块
fn transform_try_handler(try_handler: &TryHandlerStatement, output: &mut String) {
    // 处理器定义
    output.push_str("const handler = createHandler({\n");

    // 处理各个case
    for case in try_handler.handler_cases() {
        let effect_name = case.effect_name();
        let params = case.parameters();
        let body = case.body();

        output.push_str(&format!("  '{}': (resume{}) => {{\n", effect_name, format_params(params)));

        // 处理case体
        transform_case_body(body, output);

        output.push_str("  },\n");
    }

    output.push_str("});\n\n");

    // 运行try块
    output.push_str("runWithHandler(() => {\n");

    // 转换try块体
    for statement in try_handler.try_body() {
        match statement {
            VikingStatement::Raise(raise_stmt) => {
                transform_raise(raise_stmt, output);
            }
            VikingStatement::Resume(resume_stmt) => {
                transform_resume(resume_stmt, output);
            }
            _ => {
                // 其他语句处理
            }
        }
    }

    output.push_str("}, handler);\n");
}

/// 转换raise语句
fn transform_raise(raise_stmt: &RaiseStatement, output: &mut String) {
    let effect_name = raise_stmt.effect_name();
    let args = raise_stmt.arguments();

    output.push_str(&format!("  raise('{}'{});\n", effect_name, format_args(args)));
}

/// 转换resume语句
fn transform_resume(resume_stmt: &ResumeStatement, output: &mut String) {
    let arg = resume_stmt.argument();

    if let Some(arg_value) = arg {
        output.push_str(&format!("  return resume({});\n", arg_value));
    }
    else {
        output.push_str("  return resume();\n");
    }
}

/// 转换case体
fn transform_case_body(body: &[VikingStatement], output: &mut String) {
    for statement in body {
        match statement {
            VikingStatement::Raise(raise_stmt) => {
                transform_raise(raise_stmt, output);
            }
            VikingStatement::Resume(resume_stmt) => {
                transform_resume(resume_stmt, output);
            }
            _ => {
                // 其他语句处理
            }
        }
    }
}

/// 格式化参数列表
fn format_params(params: &[String]) -> String {
    if params.is_empty() {
        String::new()
    }
    else {
        let mut result = String::new();
        for param in params {
            result.push_str(&format!(", {}", param));
        }
        result
    }
}

/// 格式化参数列表
fn format_args(args: &[String]) -> String {
    if args.is_empty() {
        String::new()
    }
    else {
        let mut result = String::new();
        for arg in args {
            result.push_str(&format!(", {}", arg));
        }
        result
    }
}
