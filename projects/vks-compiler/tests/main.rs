#[test]
fn ready() {
    println!("it works!")
}

use oxc::{
    allocator::Allocator,
    ast::ast::Program,
    codegen::{CodeGenerator, CodegenOptions, LegalComment},
    parser::Parser,
    semantic::SemanticBuilder,
    span::SourceType,
    transformer::{DecoratorOptions, HelperLoaderMode, HelperLoaderOptions, TransformOptions, Transformer, TypeScriptOptions},
};
use oxc_isolated_declarations::{IsolatedDeclarations, IsolatedDeclarationsOptions};
use std::{
    borrow::Cow,
    fs::File,
    io::Write,
    path::{Path, PathBuf},
};
use vks_compiler::{VksError, VksErrorKind};

#[test]
fn main() -> Result<(), VksError> {
    let here = Path::new(env!("CARGO_MANIFEST_DIR"));
    let compiler = CompileOptions { debug: true };
    compiler.writer().generate_file(&here.join("tests/basic/index.ts"), &here.join("tests/basic/debug"))?;
    let compiler = CompileOptions { debug: false };
    compiler.writer().generate_file(&here.join("tests/basic/index.ts"), &here.join("tests/basic/release"))?;
    Ok(())
}

pub struct CompileOptions {
    debug: bool,
}

impl CompileOptions {
    pub fn writer(&self) -> CompileWriter {
        CompileWriter { allocator: Allocator::default(), options: self.clone() }
    }
}

pub struct CompileWriter<'i> {
    allocator: Allocator,
    options: &'i CompileOptions,
}

impl<'i> CompileWriter<'i> {
    fn ensure_io(&self, input: &Path, output: &Path) -> Result<(), VksError> {
        if input.is_file() {
        }
        else {
            Err(VksErrorKind::UnknownError)?
        }
        if output.exists() {
            if output.is_dir() { Ok(()) } else { Err(VksErrorKind::UnknownError)? }
        }
        else {
            match std::fs::create_dir_all(output) {
                Ok(_) => Ok(()),
                Err(e) => Err(VksErrorKind::UnknownError)?,
            }
        }
    }

    fn generate_dts<'a>(&self, input: Program<'a>, output: &Path) -> Result<(), VksError> {
        let id_ret =
            IsolatedDeclarations::new(&self.allocator, IsolatedDeclarationsOptions { strip_internal: true }).build(&ret.program);
        let printed = CodeGenerator::new().build(&id_ret.program).code;
    }

    fn generate_file(&self, input: &Path, output: &Path) -> Result<(), VksError> {
        self.ensure_io(input, output)?;

        let source_text = std::fs::read_to_string(input).unwrap_or_else(|err| panic!("{} not found.\n{err}", input.display()));
        let source_type = SourceType::from_path(input).unwrap();

        let ret = Parser::new(&self.allocator, &source_text, source_type).parse();

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

        let transform_options = TransformOptions {
            cwd: Default::default(),
            assumptions: Default::default(),
            typescript: TypeScriptOptions {
                jsx_pragma: Default::default(),
                jsx_pragma_frag: Default::default(),
                only_remove_type_imports: false,
                allow_namespaces: true,
                allow_declare_fields: true,
                optimize_const_enums: true,
                rewrite_import_extensions: None,
            },
            decorator: DecoratorOptions { legacy: false, emit_decorator_metadata: true },
            jsx: Default::default(),
            env: Default::default(),
            proposals: Default::default(),
            helper_loader: HelperLoaderOptions {
                module_name: Cow::Borrowed("@valkyrie-language/vks-runtime"),
                mode: HelperLoaderMode::External,
            },
        };
        let ret = Transformer::new(&allocator, input, &transform_options).build_with_scoping(scoping, &mut program);

        if !ret.errors.is_empty() {
            println!("Transformer Errors:");
            for error in ret.errors {
                let error = error.with_source_code(source_text.clone());
                println!("{error:?}");
            }
        }

        let codegen = CodegenOptions {
            single_quote: true,
            minify: !self.debug,
            comments: !self.debug,
            annotation_comments: !self.debug,
            legal_comments: LegalComment::External,
            source_map_path: Some(PathBuf::from("index.map.json")),
        };
        let printed = CodeGenerator::new().with_options(codegen).build(&program);
        let mut js_file = File::create(output.join("index.js")).unwrap();
        js_file.write_all(printed.code.as_bytes()).unwrap();
        let mut map_file = File::create(output.join("index.map.json")).unwrap();
        match printed.map {
            Some(s) => {
                map_file.write_all(s.to_json_string().as_bytes()).unwrap();
            }
            None => {
                panic!("missing")
            }
        };
        Ok(())
    }
}
