// #![deny(missing_debug_implementations, missing_copy_implementations)]
// #![warn(missing_docs, rustdoc::missing_crate_level_docs)]
#![doc = include_str!("../readme.md")]
#![doc(html_logo_url = "https://raw.githubusercontent.com/oovm/shape-rs/dev/projects/images/Trapezohedron.svg")]
#![doc(html_favicon_url = "https://raw.githubusercontent.com/oovm/shape-rs/dev/projects/images/Trapezohedron.svg")]


mod errors;
pub mod ast;

pub use crate::{
    errors::{Result, VksError, VksErrorKind},
};

/// 将Viking脚本转换为JavaScript代码
pub fn compile_to_js(program: &ast::VikingProgram) -> String {
    ast::transform::transform_to_js(program)
}
