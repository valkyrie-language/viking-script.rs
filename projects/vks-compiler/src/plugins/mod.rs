use rolldown::plugin::Plugin;
use std::{
    borrow::Cow,
    fmt::{Debug, Formatter}
    ,
};

pub struct VikingScriptCompilerPlugin {}

impl Debug for VikingScriptCompilerPlugin {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        f.write_str("VikingScriptCompilerPlugin")
    }
}

impl Plugin for VikingScriptCompilerPlugin {
    fn name(&self) -> Cow<'static, str> {
        Cow::Borrowed("vks:compiler")
    }
}
