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
    let compiler = CompileOptions {
        name: "named".to_string(),
        release: false,
        source_map: true,
        target: Default::default(),
        entry: folder.join("src/index.ts"),
        output: folder.join("dist"),
        node_modules: Default::default(),
    };
    

}
