use super::*;

impl From<VksErrorKind> for VksError {
    fn from(value: VksErrorKind) -> Self {
        Self {
            kind: Box::new(value),
        }
    }
}