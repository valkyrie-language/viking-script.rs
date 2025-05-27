use serde::{Deserialize, Serialize};

/// Represents a part of a rule during building
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Rule {
    name: String,
    item: RuleItem,
    is_atomic: bool,
    /// find external if not empty
    is_extern: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RuleItem {
    /// Reference to another rule by name
    Rule {
        name: String,
    },
    /// Literal string to match, e.g., "+", "keyword"
    Literal {
        text: String,
    },
    /// Reference to a regex rule by name
    Regex {
        regex: String,
    },
    Sequence {
        items: Vec<RuleItem>,
    },
    Choice {
        items: Vec<RuleItem>,
    },
    Trapped(Box<TrapRule>),
    Tagged(Box<TagRule>),
    Pinned(Box<PinRule>),
    //...
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrapRule {
    item: RuleItem,
    recover: Option<RuleItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TagRule {
    item: RuleItem,
    tag: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PinRule {
    item: RuleItem,
}
