use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct NodePool {
    green_pool: Vec<GreenData>,
    green_unused: Vec<usize>,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]

pub struct GreenData {
    /// language id
    language: u32,
    /// node kind
    kind: u32,
    /// tag id
    tag: u32,
    /// total text length
    length: u32,
    /// children if not leaf, leaf has no children
    children: Vec<u32>,
}

#[derive(Copy, Clone, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]

pub struct GreenNode {
    /// The node index in the green pool
    node_id: u32,
}
