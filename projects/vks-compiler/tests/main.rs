use rolldown::{Bundler, BundlerOptions, InputItem, OutputFormat, Platform};
use rolldown_common::{ExperimentalOptions, TreeshakeOptions};
use std::{fmt::Debug, path::Path, sync::Arc};
use vks_compiler::{CompileOptions, VikingScriptCompilerPlugin, VksError};

#[test]
fn ready() {
    println!("it works!")
}

#[tokio::test]
async fn main22() {
    let here = Path::new(env!("CARGO_MANIFEST_DIR"));
    let index = here.join("tests/basic/src/index.ts");
    let compiler = CompileOptions {
        name: "ttt".to_string(),
        release: false,
        source_map: true,
        target: Default::default(),
        inputs: vec![InputItem { name: None, import: index.to_string_lossy().to_string() }],
        output: here.join("tests/basic/dist"),
    };

    let mut bundler = Bundler::with_plugins(compiler.as_bundle_options(Platform::Browser), vec![
        Arc::new(VikingScriptCompilerPlugin {}),
        // Arc::new(IsolatedDeclarationPlugin { strip_internal: false }),
    ]);
    let _result = bundler.write().await.unwrap();
    let mut bundler = Bundler::with_plugins(compiler.as_bundle_options(Platform::Node), vec![
        Arc::new(VikingScriptCompilerPlugin {}),
        // Arc::new(IsolatedDeclarationPlugin { strip_internal: false }),
    ]);
    let _result = bundler.write().await.unwrap();
    let mut bundler = Bundler::with_plugins(compiler.as_bundle_options(Platform::Neutral), vec![
        Arc::new(VikingScriptCompilerPlugin {}),
        // Arc::new(IsolatedDeclarationPlugin { strip_internal: false }),
    ]);
    let _result = bundler.write().await.unwrap();
}