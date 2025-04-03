use rolldown::{Bundler, Platform};
use std::{path::Path, sync::Arc};
use vks_compiler::{CompileOptions, VikingScriptCompilerPlugin};

#[test]
fn ready() {
    println!("it works!")
}

#[tokio::test]
async fn main22() {
    let here = Path::new(env!("CARGO_MANIFEST_DIR"));
    let folder = here.join("tests/basic");

    let compiler = CompileOptions {
        name: "ttt".to_string(),
        release: false,
        source_map: true,
        target: Default::default(),
        entry: folder.join("source/index.ts"),
        output: folder.join("target"),
        node_modules: Default::default(),
    };
    let mut bundler =
        Bundler::with_plugins(compiler.as_bundle_options(Platform::Browser), vec![Arc::new(VikingScriptCompilerPlugin {})]);
    let _result = bundler.write().await.unwrap();
    println!("{:?}", _result.assets);

    let mut bundler =
        Bundler::with_plugins(compiler.as_bundle_options(Platform::Node), vec![Arc::new(VikingScriptCompilerPlugin {})]);
    let _result = bundler.write().await.unwrap();

    let mut bundler =
        Bundler::with_plugins(compiler.as_bundle_options(Platform::Neutral), vec![Arc::new(VikingScriptCompilerPlugin {})]);
    let _result = bundler.write().await.unwrap();
}
