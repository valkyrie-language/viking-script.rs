
use rolldown::{Bundler, BundlerOptions, InputItem, OutputFormat, Platform};
use rolldown_common::ESTarget;
use rolldown_plugin_isolated_declaration::IsolatedDeclarationPlugin;
use std::{
    fmt::Debug,
    path::Path,
    sync::Arc,
};
use vks_compiler::{CompileOptions, VikingScriptCompilerPlugin, VksError};

#[test]
fn ready() {
    println!("it works!")
}

#[test]
fn main() -> Result<(), VksError> {
    let here = Path::new(env!("CARGO_MANIFEST_DIR"));
    let compiler = CompileOptions { release: false, source_map: true };
    compiler.writer().generate(&here.join("tests/basic/index.ts"), &here.join("tests/basic/debug"))?;
    let compiler = CompileOptions { release: true, source_map: true };
    compiler.writer().generate(&here.join("tests/basic/index.ts"), &here.join("tests/basic/release"))?;
    Ok(())
}


#[tokio::test]
async fn main22() {
    let compiler = CompileOptions { release: false, source_map: true };

    let here = Path::new(env!("CARGO_MANIFEST_DIR"));
    let index = here.join("tests/basic/src/index.ts");
    let options = BundlerOptions {
        name: Some("aaa".to_string()),
        input: Some(vec![
            InputItem { name: Some("index.ts".to_string()), import: index.to_string_lossy().to_string() },
            // InputItem { name: Some("index.ts".to_string()), import: index.to_string_lossy().to_string() },
        ]),
        // dir: Some(here.join("tests/basic/dist").to_string_lossy().to_string()),
        // file: Some(here.join("tests/basic/dist/index.browser.js").to_string_lossy().to_string()),
        // platform: Some(Platform::Browser),
        // format: Some(OutputFormat::Cjs),
        file: Some(here.join("tests/basic/dist/index.node.js").to_string_lossy().to_string()),
        platform: Some(Platform::Node),
        format: Some(OutputFormat::Esm),
        cwd: None,
        minify: Some(compiler.as_minify_options()),
        transform: None,
        target: Some(ESTarget::Es2015),
        sourcemap: Some(compiler.as_source_map_options()),
        ..Default::default()
    };
    let mut bundler = Bundler::with_plugins(options, vec![
        Arc::new(VikingScriptCompilerPlugin {}),
        // Arc::new(IsolatedDeclarationPlugin { strip_internal: false }),
    ]);

    let _result = bundler.write().await.unwrap();
}
