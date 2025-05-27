use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

mod rules;

pub struct GrammarBuilder {
    //...
}

pub struct GrammarInfo {
    config: GrammarConfig,
    // ...
}

pub struct GrammarConfig {
    variables: BTreeMap<String, String>,
    tab_as_space: u32,
    regex_slice: u32,
    // ...
}

impl Default for GrammarConfig {
    fn default() -> Self {
        Self { variables: BTreeMap::new(), tab_as_space: 4, regex_slice: 1024 }
    }
}
