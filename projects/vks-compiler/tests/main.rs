use rolldown::{Bundler, Platform};
use rolldown_plugin_isolated_declaration::IsolatedDeclarationPlugin;
use std::{path::Path, sync::Arc};
use vks_compiler::{CompileOptions, VikingScriptCompilerPlugin};

#[test]
fn ready() {
    println!("it works!")
}

#[tokio::test]
async fn compile22() {
    let here = Path::new(env!("CARGO_MANIFEST_DIR"));
    let folder = here.join("tests/basic");
    println!("Path: {:?}", folder.display());
    
    let compiler = CompileOptions {
        name: "named".to_string(),
        release: false,
        source_map: true,
        target: Default::default(),
        entry: folder.join("src/index.ts"),
        output: folder.join("dist"),
        node_modules: Default::default(),
    };
    let full = compiler.as_bundle_options(Platform::Browser);
    println!("Full: {:#?}", full);
    let mut bundler = Bundler::with_plugins(compiler.as_bundle_options(Platform::Browser), vec![
        // Arc::new(VikingScriptCompilerPlugin {}),
        Arc::new(IsolatedDeclarationPlugin { strip_internal: true }),
    ]);
    let _result = bundler.write().await.unwrap();
    // let mut bundler =
    //     Bundler::with_plugins(compiler.as_bundle_options(Platform::Node), vec![Arc::new(VikingScriptCompilerPlugin {})]);
    // let _result = bundler.write().await.unwrap();
    //
    // let mut bundler =
    //     Bundler::with_plugins(compiler.as_bundle_options(Platform::Neutral), vec![Arc::new(VikingScriptCompilerPlugin {})]);
    // let _result = bundler.write().await.unwrap();
}
