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
    let compiler = CompileOptions { name: "ttt".to_string(), release: false, source_map: true, target: Default::default() };

    let here = Path::new(env!("CARGO_MANIFEST_DIR"));
    let index = here.join("tests/basic/src/index.ts");
    let basic = BundlerOptions {
        name: Some(compiler.name),
        input: Some(vec![
            InputItem { name: Some("index.ts".to_string()), import: index.to_string_lossy().to_string() },
            // InputItem { name: Some("index.ts".to_string()), import: index.to_string_lossy().to_string() },
        ]),
        cwd: None,
        minify: Some(compiler.as_minify_options()),
        treeshake: TreeshakeOptions::Boolean(true),
        experimental: Some(ExperimentalOptions {
            strict_execution_order: None,
            disable_live_bindings: None,
            vite_mode: None,
            resolve_new_url_to_asset: None,
            incremental_build: None,
            hmr: None,
        }),
        transform: None,
        target: Some(compiler.target),
        sourcemap: Some(compiler.as_source_map_options()),
        ..Default::default()
    };
    let browser = BundlerOptions {
        file: Some(here.join("tests/basic/dist/index.browser.js").to_string_lossy().to_string()),
        platform: Some(Platform::Browser),
        format: Some(OutputFormat::Cjs),
        ..basic.clone()
    };
    let node = BundlerOptions {
        file: Some(here.join("tests/basic/dist/index.node.js").to_string_lossy().to_string()),
        platform: Some(Platform::Node),
        format: Some(OutputFormat::Esm),
        ..basic.clone()
    };
    let mut bundler = Bundler::with_plugins(browser, vec![
        Arc::new(VikingScriptCompilerPlugin {}),
        // Arc::new(IsolatedDeclarationPlugin { strip_internal: false }),
    ]);
    let _result = bundler.write().await.unwrap();
    let mut bundler = Bundler::with_plugins(node, vec![
        Arc::new(VikingScriptCompilerPlugin {}),
        // Arc::new(IsolatedDeclarationPlugin { strip_internal: false }),
    ]);
    let _result = bundler.write().await.unwrap();
}
