use std::path::PathBuf;
use oxc::allocator::Allocator;
use oxc::codegen::{CodegenOptions, LegalComment};
use oxc::transformer::TransformOptions;
use rolldown_common::{BundlerOptions, ESTarget, ExperimentalOptions, InputItem, MakeAbsoluteExternalsRelative, MinifyOptionsObject, OutputFormat, Platform, RawMinifyOptions, ResolveOptions, SourceMapType, TreeshakeOptions};
use crate::CompileWriter;

#[derive(Clone, Debug)]
pub struct CompileOptions {
    pub name: String,
    pub release: bool,
    pub source_map: bool,
    pub target: ESTarget,
    pub entry: PathBuf,
    pub output: PathBuf,
    pub node_modules: PathBuf,
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
            source_map_path: None,
        }
    }
    pub fn as_minify_options(&self) -> RawMinifyOptions {
        RawMinifyOptions::Object(MinifyOptionsObject {
            mangle: self.release,
            compress: self.release,
            remove_whitespace: self.release,
        })
    }
    pub fn as_source_map_options(&self) -> SourceMapType {
        if self.source_map { SourceMapType::File } else { SourceMapType::Hidden }
    }
    pub fn as_bundle_options(&self, platform: Platform) -> BundlerOptions {
        let mut options = BundlerOptions {
            name: Some(self.name.to_string()),
            input: Some(vec![InputItem { name: None, import: self.entry.to_string_lossy().to_string() }]),
            dir: Some(self.output.to_string_lossy().to_string()),
            cwd: None,
            minify: Some(self.as_minify_options()),
            treeshake: TreeshakeOptions::Boolean(true),
            experimental: Some(ExperimentalOptions {
                strict_execution_order: None,
                disable_live_bindings: None,
                vite_mode: None,
                resolve_new_url_to_asset: None,
                incremental_build: None,
                hmr: None,
            }),
            transform: Some(TransformOptions {
                cwd: Default::default(),
                assumptions: Default::default(),
                typescript: Default::default(),
                decorator: Default::default(),
                jsx: Default::default(),
                env: Default::default(),
                proposals: Default::default(),
                helper_loader: Default::default(),
            }),
            resolve: Some(ResolveOptions {
                alias: None,
                alias_fields: None,
                condition_names: None,
                exports_fields: None,
                extensions: None,
                extension_alias: None,
                main_fields: None,
                main_files: None,
                modules: Some(vec![self.node_modules.to_string_lossy().to_string()]),
                symlinks: Some(true),
                tsconfig_filename: None,
            }),
            target: Some(self.target),
            sourcemap: Some(self.as_source_map_options()),
            make_absolute_externals_relative: Some(MakeAbsoluteExternalsRelative::Bool(true)),
            ..Default::default()
        };
        match platform {
            Platform::Browser => {
                options.file = Some(self.output.join("index.browser.js").to_string_lossy().to_string());
                options.platform = Some(Platform::Browser);
                options.format = Some(OutputFormat::Iife);
            }
            Platform::Node => {
                options.file = Some(self.output.join("index.node.js").to_string_lossy().to_string());
                options.platform = Some(Platform::Node);
                options.format = Some(OutputFormat::Esm);
            }
            Platform::Neutral => {
                options.file = Some(self.output.join("index.js").to_string_lossy().to_string());
                options.platform = Some(Platform::Neutral);
                options.format = Some(OutputFormat::Umd);
            }
        };
        // if self.entry.len() > 1 {
        //     options.file = None;
        // }
        // else {
        //     options.dir = None;
        // }
        options
    }
}
