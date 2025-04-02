use std::{
    error::Error,
    fmt::{Debug, Display, Formatter},
};

mod convert;
mod display;

/// The result type of this crate.
pub type Result<T> = std::result::Result<T, VksError>;

/// A boxed error kind, wrapping an [VksErrorKind].
#[derive(Clone)]
pub struct VksError {
    kind: Box<VksErrorKind>,
}

/// The kind of [VksError].
#[derive(Debug, Copy, Clone)]
pub enum VksErrorKind {
    /// An unknown error.
    UnknownError,
}
