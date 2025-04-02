use super::*;

impl From<VksErrorKind> for VksError {
    fn from(value: VksErrorKind) -> Self {
        Self { kind: Box::new(value) }
    }
}

impl From<std::io::Error> for VksError {
    fn from(e: std::io::Error) -> Self {
        VksErrorKind::IoError { path: Default::default(), error: e }.into()
    }
}

