#[test]
fn ready() {
    println!("it works!")
}

use std::{
    fs::File,
    io::Write,
    path::{Path, PathBuf},
};

use oxc::{
    allocator::Allocator,
    codegen::{CodeGenerator, CodegenOptions},
    parser::Parser,
    semantic::SemanticBuilder,
    span::SourceType,
    transformer::{HelperLoaderMode, TransformOptions, Transformer},
};

#[test]
fn main() {
    let here = Path::new(env!("CARGO_MANIFEST_DIR"));
    let compiler = CompileOptions { debug: false };
    compiler.generate_file(&here.join("tests/basic/main.ts"), &here.join("tests/basic"))
}

pub struct CompileOptions {
    debug: bool,
}

impl CompileOptions {
    fn generate_file(&self, input: &Path, output: &Path) {
        if !output.is_dir() {
            panic!("{} is not a directory", output.display())
        }
        else {
            std::fs::create_dir_all(output).unwrap()
        }
        let source_text = std::fs::read_to_string(input).unwrap_or_else(|err| panic!("{} not found.\n{err}", input.display()));
        let allocator = Allocator::default();
        let source_type = SourceType::from_path(input).unwrap();

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

        let mut transform_options = TransformOptions::default();
        transform_options.helper_loader.mode = HelperLoaderMode::External;

        let ret = Transformer::new(&allocator, input, &transform_options).build_with_scoping(scoping, &mut program);

        if !ret.errors.is_empty() {
            println!("Transformer Errors:");
            for error in ret.errors {
                let error = error.with_source_code(source_text.clone());
                println!("{error:?}");
            }
        }

        let mut codegen = CodegenOptions::default();
        codegen.single_quote = true;
        codegen.comments = false;
        codegen.source_map_path = Some(PathBuf::from("test.map.json"));

        let printed = CodeGenerator::new().with_options(codegen).build(&program);
        let mut js_file = File::create(output.join("test.js")).unwrap();
        js_file.write_all(printed.code.as_bytes()).unwrap();
        let mut map_file = File::create(output.join("test.map.json")).unwrap();
        match printed.map {
            Some(s) => {
                map_file.write_all(s.to_json_string().as_bytes()).unwrap();
            }
            None => {
                panic!("missing")
            }
        };
    }
}
