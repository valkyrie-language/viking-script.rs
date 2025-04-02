#[test]
fn ready() {
    println!("it works!")
}

use std::path::Path;

use oxc::{
    allocator::Allocator,
    codegen::CodeGenerator,
    parser::Parser,
    semantic::SemanticBuilder,
    span::SourceType,
    transformer::{BabelOptions, EnvOptions, HelperLoaderMode, TransformOptions, Transformer},
};

#[test]
fn main() {
    let babel_options_path: Option<String> = None;
    let targets: Option<String> = None;
    let target: Option<String> = None;
    let name = Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/test.ts");

    let path = Path::new(&name);
    let source_text = std::fs::read_to_string(path).unwrap_or_else(|err| panic!("{} not found.\n{err}", name.display()));
    let allocator = Allocator::default();
    let source_type = SourceType::from_path(path).unwrap();

    let ret = Parser::new(&allocator, &source_text, source_type).parse();

    if !ret.errors.is_empty() {
        println!("Parser Errors:");
        for error in ret.errors {
            let error = error.with_source_code(source_text.clone());
            println!("{error:?}");
        }
    }

    println!("Original:\n");
    println!("{source_text}\n");

    let mut program = ret.program;

    let ret = SemanticBuilder::new()
        // Estimate transformer will triple scopes, symbols, references
        .with_excess_capacity(2.0)
        .with_scope_tree_child_ids(true)
        .build(&program);

    if !ret.errors.is_empty() {
        println!("Semantic Errors:");
        for error in ret.errors {
            let error = error.with_source_code(source_text.clone());
            println!("{error:?}");
        }
    }

    let scoping = ret.semantic.into_scoping();

    let mut transform_options = if let Some(babel_options_path) = babel_options_path {
        let babel_options_path = Path::new(&babel_options_path);
        let babel_options = BabelOptions::from_test_path(babel_options_path);
        TransformOptions::try_from(&babel_options).unwrap()
    }
    else if let Some(query) = &targets {
        TransformOptions { env: EnvOptions::from_browserslist_query(query).unwrap(), ..TransformOptions::default() }
    }
    else if let Some(target) = &target {
        TransformOptions::from_target(target).unwrap()
    }
    else {
        TransformOptions::enable_all()
    };

    transform_options.helper_loader.mode = HelperLoaderMode::External;

    let ret = Transformer::new(&allocator, path, &transform_options).build_with_scoping(scoping, &mut program);

    if !ret.errors.is_empty() {
        println!("Transformer Errors:");
        for error in ret.errors {
            let error = error.with_source_code(source_text.clone());
            println!("{error:?}");
        }
    }

    let printed = CodeGenerator::new().build(&program).code;
    println!("Transformed:\n");
    println!("{printed}");
}
