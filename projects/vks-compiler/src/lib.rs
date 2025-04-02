// #![deny(missing_debug_implementations, missing_copy_implementations)]
// #![warn(missing_docs, rustdoc::missing_crate_level_docs)]
#![doc = include_str!("../readme.md")]
#![doc(html_logo_url = "https://raw.githubusercontent.com/oovm/shape-rs/dev/projects/images/Trapezohedron.svg")]
#![doc(html_favicon_url = "https://raw.githubusercontent.com/oovm/shape-rs/dev/projects/images/Trapezohedron.svg")]

mod errors;

pub use crate::errors::{Result, VksError, VksErrorKind};
use oxc::{
    allocator::Allocator,
    ast::ast::Program,
    codegen::{CodeGenerator, CodegenOptions, LegalComment},
    parser::Parser,
    semantic::SemanticBuilder,
    span::SourceType,
};
use oxc_isolated_declarations::{IsolatedDeclarations, IsolatedDeclarationsOptions};
use oxc_transformer::{
    DecoratorOptions, HelperLoaderMode, HelperLoaderOptions, TransformOptions, Transformer, TypeScriptOptions,
};
use std::{
    borrow::Cow,
    fs::File,
    io::Write,
    path::{Path, PathBuf},
};

#[derive(Copy, Clone, Debug)]
pub struct CompileOptions {
    pub release: bool,
    pub source_map: Option<bool>,
}

impl CompileOptions {
    pub fn writer(&self) -> CompileWriter {
        CompileWriter { allocator: Allocator::default(), options: &self }
    }
    pub fn as_codegen_options(&self, json: PathBuf) -> CodegenOptions {
        CodegenOptions {
            single_quote: true,
            minify: self.release,
            comments: self.release,
            annotation_comments: self.release,
            legal_comments: LegalComment::External,
            source_map_path: match self.source_map.unwrap_or(true) {
                true => Some(json),
                false => None,
            },
        }
    }
}


pub struct CompileWriter<'i> {
    allocator: Allocator,
    options: &'i CompileOptions,
}

impl<'i> CompileWriter<'i> {
    fn ensure_io(&self, input: &Path, output: &Path) -> std::result::Result<(), VksError> {
        if input.is_file() {
        }
        else {
            Err(VksErrorKind::IoError {
                path: input.to_path_buf(),
                error: std::io::Error::new(std::io::ErrorKind::IsADirectory, ""),
            })?
        }
        if output.exists() {
            if output.is_dir() {
                Ok(())
            }
            else {
                Err(VksErrorKind::IoError {
                    path: output.to_path_buf(),
                    error: std::io::Error::new(std::io::ErrorKind::AlreadyExists, ""),
                })?
            }
        }
        else {
            match std::fs::create_dir_all(output) {
                Ok(_) => Ok(()),
                Err(e) => Err(VksErrorKind::IoError { path: output.to_path_buf(), error: e })?,
            }
        }
    }
    pub fn generate(&self, input: &Path, output: &Path) -> std::result::Result<(), VksError> {
        self.ensure_io(input, output)?;

        let source_text = std::fs::read_to_string(input).unwrap_or_else(|err| panic!("{} not found.\n{err}", input.display()));
        let source_type = SourceType::from_path(input).unwrap();

        let ret = Parser::new(&self.allocator, &source_text, source_type).parse();

        for error in ret.errors {
            let error = error.with_source_code(source_text.clone());
            println!("{error:?}");
        }

        println!("Original:\n");
        println!("{source_text}\n");

        let mut program = ret.program;
        self.generate_dts(&program, output)?;

        let ret = SemanticBuilder::new()
            // Estimate transformer will triple scopes, symbols, references
            .with_excess_capacity(2.0)
            .with_scope_tree_child_ids(true)
            .build(&program);

        for error in ret.errors {
            let error = error.with_source_code(source_text.clone());
            println!("{error:?}");
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
        let ret = Transformer::new(&self.allocator, input, &transform_options).build_with_scoping(scoping, &mut program);

        for error in ret.errors {
            let error = error.with_source_code(source_text.clone());
            println!("{error:?}");
        }

        let printed =
            CodeGenerator::new().with_options(self.options.as_codegen_options(PathBuf::from("index.js.map"))).build(&program);
        let mut js_file = File::create(output.join("index.js")).unwrap();
        js_file.write_all(printed.code.as_bytes()).unwrap();
        let mut map_file = File::create(output.join("index.js.map")).unwrap();
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
    fn generate_dts<'a>(&self, input: &Program<'a>, output: &Path) -> std::result::Result<(), VksError> {
        let id_ret =
            IsolatedDeclarations::new(&self.allocator, IsolatedDeclarationsOptions { strip_internal: true }).build(input);
        let generated = CodeGenerator::new()
            .with_options(self.options.as_codegen_options(PathBuf::from("../index.ts")))
            .build(&id_ret.program);
        let mut dts_file = File::create(output.join("index.d.ts"))?;
        dts_file.write_all(generated.code.as_bytes())?;
        let mut map_file = File::create(output.join("index.d.ts.map"))?;
        match generated.map {
            Some(s) => {
                map_file.write_all(s.to_json_string().as_bytes())?;
            }
            None => {
                panic!("missing")
            }
        };
        Ok(())
    }
}
