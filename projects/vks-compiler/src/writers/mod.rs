use crate::{CompileOptions, VksError, VksErrorKind};
use oxc::allocator::Allocator;
use std::path::Path;

pub struct CompileWriter<'i> {
    pub(crate) allocator: Allocator,
    pub(crate) options: &'i CompileOptions,
}

impl<'i> CompileWriter<'i> {
    fn ensure_io(&self, input: &Path, output: &Path) -> std::result::Result<(), VksError> {
        if input.is_file() {
        }
        else {
            Err(VksErrorKind::IoError {
                path: input.to_path_buf(),
                error: std::io::Error::new(std::io::ErrorKind::IsADirectory, ""),
            })?
        }
        if output.exists() {
            if output.is_dir() {
                Ok(())
            }
            else {
                Err(VksErrorKind::IoError {
                    path: output.to_path_buf(),
                    error: std::io::Error::new(std::io::ErrorKind::AlreadyExists, ""),
                })?
            }
        }
        else {
            match std::fs::create_dir_all(output) {
                Ok(_) => Ok(()),
                Err(e) => Err(VksErrorKind::IoError { path: output.to_path_buf(), error: e })?,
            }
        }
    }
    pub fn generate(&self, input: &Path, output: &Path) -> std::result::Result<(), VksError> {
        self.ensure_io(input, output)?;

        Ok(())
    }
}
