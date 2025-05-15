use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use crate::TagId;
// Using u32 for GreenNode indices assumes less than 4 billion nodes.
// If more are needed, u64 might be considered, but u32 is common.

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct GreenData {
    /// Language ID (e.g., ID of the grammar)
    pub language_id: u32, // Renamed from `language` to avoid conflict with keyword
    /// Node kind (e.g., rule name's ID, or token type ID)
    pub kind: u32, // This could be a RuleId or a specific token kind
    /// Tag ID (from Tagged instruction)
    pub tag_id: TagId, // Renamed from `tag`
    /// Total text length covered by this node and its children
    pub length: u32,
    /// Children if not a leaf. Leaf nodes have an empty Vec.
    /// Stores indices into the NodePool's green_pool.
    pub children: Vec<u32>,
}

#[derive(Copy, Clone, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct GreenNode {
    /// The node index in the green pool (NodePool.green_pool)
    pub node_id: u32,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct NodePool {
    green_pool: Vec<GreenData>,
    green_unused: VecDeque<u32>, // Use VecDeque for efficient front removal
}

impl NodePool {
    pub fn new() -> Self {
        Self {
            green_pool: Vec::new(),
            green_unused: VecDeque::new(),
        }
    }

    pub fn with_capacity(capacity: usize) -> Self {
        Self {
            green_pool: Vec::with_capacity(capacity),
            green_unused: VecDeque::new(),
        }
    }

    /// Allocates a new green node or reuses an old one.
    pub fn alloc(
        &mut self,
        language_id: u32,
        kind: u32,
        tag_id: TagId,
        length: u32,
        children: Vec<GreenNode>, // Takes GreenNode to extract their IDs
    ) -> GreenNode {
        let children_ids: Vec<u32> = children.iter().map(|cn| cn.node_id).collect();
        let data = GreenData {
            language_id,
            kind,
            tag_id,
            length,
            children: children_ids,
        };

        if let Some(reused_id) = self.green_unused.pop_front() {
            self.green_pool[reused_id as usize] = data;
            GreenNode { node_id: reused_id }
        } else {
            let new_id = self.green_pool.len() as u32;
            self.green_pool.push(data);
            GreenNode { node_id: new_id }
        }
    }

    /// Retrieves a reference to GreenData using its GreenNode wrapper.
    pub fn get(&self, node: GreenNode) -> Option<&GreenData> {
        self.green_pool.get(node.node_id as usize)
    }

    /// Marks a node as unused for potential recycling.
    /// Note: In a pure green tree, nodes are immutable. Recycling happens typically
    /// during tree reconstruction or if parts of the tree are known to be discarded.
    /// This is more useful if you are rebuilding trees often.
    pub fn free(&mut self, node_id: u32) {
        // Basic check to prevent double-freeing or invalid IDs, though more robust checks might be needed.
        if (node_id as usize) < self.green_pool.len() && !self.green_unused.contains(&node_id) {
            // Potentially clear or mark the data in green_pool[node_id] as invalid.
            // For now, just add to unused list.
            self.green_unused.push_back(node_id);
        }
    }

    pub fn len(&self) -> usize {
        self.green_pool.len()
    }

    pub fn is_empty(&self) -> bool {
        self.green_pool.is_empty()
    }
}

impl Default for NodePool {
    fn default() -> Self {
        Self::new()
    }
}
