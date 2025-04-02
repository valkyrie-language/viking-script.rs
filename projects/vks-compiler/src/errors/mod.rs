use std::{
    error::Error,
    fmt::{Debug, Display, Formatter},
    path::PathBuf,
};

mod convert;
mod display;

/// The result type of this crate.
pub type Result<T> = std::result::Result<T, VksError>;

/// A boxed error kind, wrapping an [VksErrorKind].
pub struct VksError {
    kind: Box<VksErrorKind>,
}

/// The kind of [VksError].
#[derive(Debug)]
pub enum VksErrorKind {
    IoError {
        path: PathBuf,
        error: std::io::Error,
    },
    /// An unknown error.
    UnknownError,
}

impl VksError {
    pub fn set_path(&mut self, path: PathBuf) {
        match self.kind.as_mut() {
            VksErrorKind::IoError { path: old, .. } => *old = path,
            _ => {}
        }
    }
}
