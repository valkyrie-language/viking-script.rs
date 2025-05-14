//! AST转换模块，将代数效应语法转换为JavaScript代码

use crate::ast::{RaiseStatement, ResumeStatement, TryHandlerStatement, VikingProgram, VikingStatement};
use crate::ast::effect::{EffectCall, EffectCase};
use arcstr::ArcStr;

/// 将Viking脚本AST转换为JavaScript代码
pub fn transform_to_js(program: &VikingProgram) -> String {
    let mut output = String::new();

    // 导入运行时
    output.push_str("import { createEffect, runWithEffects, createHandler } from 'vks-runtime';\n\n");

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
            VikingStatement::Raise(raise) => {
                // 顶层的raise语句
                transform_raise(raise, output);
                output.push_str(";\n");
            }
            VikingStatement::Resume(resume) => {
                // 顶层的resume语句
                transform_resume(resume, output);
                output.push_str(";\n");
            }
        }
    }
}

/// 转换try-handler块
fn transform_try_handler(try_handler: &TryHandlerStatement, output: &mut String) {
    // 首先定义所有效应
    let mut defined_effects = Vec::new();
    
    // 从handler cases中收集所有效应名称
    for case in try_handler.handler_cases() {
        let effect_name = case.effect_name();
        if !defined_effects.contains(&effect_name) {
            output.push_str(&format!("const {} = createEffect('{}');\n", effect_name, effect_name));
            defined_effects.push(effect_name.to_string());
        }
    }
    
    output.push_str("\n");
    
    // 处理器定义
    output.push_str("const handler = createHandler({\n");

    // 处理各个case
    for case in try_handler.handler_cases() {
        let effect_name = case.effect_name();
        let params = case.parameters();
        
        // 格式化参数列表
        let params_str = if params.is_empty() {
            String::new()
        } else {
            format!(", {}", params.join(", "))
        };

        output.push_str(&format!("  '{}': (resume{}) => {{\n", effect_name, params_str));

        // 处理case体
        for stmt in case.body() {
            match stmt {
                VikingStatement::Raise(raise_stmt) => {
                    output.push_str("    ");
                    transform_raise(raise_stmt, output);
                    output.push_str(";\n");
                }
                VikingStatement::Resume(resume_stmt) => {
                    output.push_str("    ");
                    // 在handler中，resume是调用传入的resume函数
                    if let Some(arg) = resume_stmt.argument() {
                        output.push_str(&format!("return resume({});\n", arg));
                    } else {
                        output.push_str("return resume();\n");
                    }
                }
                _ => {
                    // 其他语句类型
                }
            }
        }

        output.push_str("  },\n");
    }

    output.push_str("});\n\n");

    // 生成try块代码 - 使用生成器函数
    output.push_str("runWithEffects(function* () {\n");
    
    for stmt in try_handler.try_body() {
        match stmt {
            VikingStatement::Raise(raise_stmt) => {
                output.push_str("  ");
                transform_raise(raise_stmt, output);
                output.push_str(";\n");
            }
            VikingStatement::Resume(resume_stmt) => {
                output.push_str("  ");
                transform_resume(resume_stmt, output);
                output.push_str(";\n");
            }
            _ => {
                // 其他语句类型
            }
        }
    }
    
    output.push_str("}, handler);\n");
}

/// 转换raise语句
fn transform_raise(raise_stmt: &RaiseStatement, output: &mut String) {
    let effect = &raise_stmt.effect;
    let effect_name = effect.name();
    let args = effect.arguments();
    
    // 格式化参数
    let args_str = args.join(", ");
    
    // 生成yield语句
    output.push_str(&format!("yield {}({})", effect_name, args_str));
}

/// 转换resume语句
fn transform_resume(resume_stmt: &ResumeStatement, output: &mut String) {
    if let Some(arg) = resume_stmt.argument() {
        output.push_str(&format!("return {}", arg));
    } else {
        output.push_str("return");
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
