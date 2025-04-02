use oxc_resolver::{EnforceExtension, ResolveOptions, Resolver};
use std::path::Path;
use vks_compiler::{CompileOptions, VksError};

#[test]
fn ready() {
    println!("it works!")
}

#[test]
fn main() -> Result<(), VksError> {
    let here = Path::new(env!("CARGO_MANIFEST_DIR"));
    let compiler = CompileOptions { release: false, source_map: None };
    compiler.writer().generate(&here.join("tests/basic/index.ts"), &here.join("tests/basic/debug"))?;
    let compiler = CompileOptions { release: true, source_map: None };
    compiler.writer().generate(&here.join("tests/basic/index.ts"), &here.join("tests/basic/release"))?;
    Ok(())
}

#[test]
fn test_bundle() {
    let here = Path::new(env!("CARGO_MANIFEST_DIR"));
    let path = here.join("tests/basic");
    let specifier = "tests/basic/index.ts";

    assert!(path.is_dir(), "{path:?} must be a directory that will be resolved against.");
    assert!(path.is_absolute(), "{path:?} must be an absolute path.",);

    let options = ResolveOptions {
        tsconfig: None,
        alias: vec![],
        alias_fields: vec![],
        condition_names: vec![],
        description_files: vec!["package.json".into()],
        enforce_extension: EnforceExtension::Auto,
        extension_alias: vec![],
        exports_fields: vec![vec!["exports".into()]],
        imports_fields: vec![vec!["imports".into()]],
        extensions: vec![".js".into(), ".json".into(), ".node".into()],
        fallback: vec![],
        fully_specified: false,
        main_fields: vec!["main".into()],
        main_files: vec!["index".into()],
        modules: vec!["node_modules".into()],
        resolve_to_context: false,
        prefer_relative: false,
        prefer_absolute: false,
        restrictions: vec![],
        roots: vec![],
        symlinks: true,
        builtin_modules: false,
    };

    match Resolver::new(options).resolve(path, "index") {
        Err(error) => println!("Error: {error}"),
        Ok(resolution) => println!("Resolved: {:?}", resolution.full_path()),
    }
}
