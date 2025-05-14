//! AST节点模块
//!
//! 提供AST节点的定义和实现，使用红绿树结构和节点池提高性能。

use std::fmt;
use std::hash::{Hash, Hasher};
use serde::{Serialize, Deserialize};

use crate::peg::input::InputOffset;

// 导出缓存模块
pub mod cache;
pub use self::cache::{NodeCache, NodeCacheKey, NodeCacheValue};

/// 节点池，用于复用节点提高性能
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct NodePool {
    /// 绿色节点池
    green_pool: Vec<GreenData>,
    /// 未使用的绿色节点索引
    green_unused: Vec<usize>,
}

impl NodePool {
    /// 创建一个新的节点池
    pub fn new() -> Self {
        Self {
            green_pool: Vec::new(),
            green_unused: Vec::new(),
        }
    }

    /// 创建一个新的绿色节点
    pub fn new_node(&mut self, language: u32, kind: u32, tag: u32, length: u32, children: Vec<u32>) -> GreenNode {
        let node_data = GreenData {
            language,
            kind,
            tag,
            length,
            children,
        };

        // 尝试复用未使用的节点
        if let Some(index) = self.green_unused.pop() {
            self.green_pool[index] = node_data;
            GreenNode { node_id: index as u32 }
        } else {
            // 创建新节点
            let index = self.green_pool.len();
            self.green_pool.push(node_data);
            GreenNode { node_id: index as u32 }
        }
    }

    /// 创建一个叶子节点
    pub fn new_leaf(&mut self, language: u32, kind: u32, tag: u32, length: u32) -> GreenNode {
        self.new_node(language, kind, tag, length, Vec::new())
    }

    /// 获取节点数据
    pub fn get_node_data(&self, node: GreenNode) -> Option<&GreenData> {
        self.green_pool.get(node.node_id as usize)
    }

    /// 释放节点
    pub fn release_node(&mut self, node: GreenNode) {
        self.green_unused.push(node.node_id as usize);
    }

    /// 获取节点池大小
    pub fn size(&self) -> usize {
        self.green_pool.len()
    }

    /// 获取未使用节点数量
    pub fn unused_count(&self) -> usize {
        self.green_unused.len()
    }

    /// 清理节点池
    pub fn clear(&mut self) {
        self.green_pool.clear();
        self.green_unused.clear();
    }
    
    /// 获取节点的子节点
    pub fn get_children(&self, node: GreenNode) -> Vec<GreenNode> {
        if let Some(data) = self.get_node_data(node) {
            data.children.iter().map(|&id| GreenNode { node_id: id }).collect()
        } else {
            Vec::new()
        }
    }
    
    /// 获取节点的文本长度
    pub fn get_length(&self, node: GreenNode) -> u32 {
        if let Some(data) = self.get_node_data(node) {
            data.length
        } else {
            0
        }
    }
    
    /// 获取节点的类型
    pub fn get_kind(&self, node: GreenNode) -> u32 {
        if let Some(data) = self.get_node_data(node) {
            data.kind
        } else {
            0
        }
    }
    
    /// 获取节点的标签
    pub fn get_tag(&self, node: GreenNode) -> u32 {
        if let Some(data) = self.get_node_data(node) {
            data.tag
        } else {
            0
        }
    }
}

/// 绿色节点数据
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct GreenData {
    /// 语言ID
    pub language: u32,
    /// 节点类型
    pub kind: u32,
    /// 标签ID
    pub tag: u32,
    /// 总文本长度
    pub length: u32,
    /// 子节点（如果不是叶子节点）
    pub children: Vec<u32>,
}

/// 绿色节点引用
#[derive(Copy, Clone, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct GreenNode {
    /// 节点在绿色节点池中的索引
    pub node_id: u32,
}

impl GreenNode {
    /// 创建一个无效的绿色节点
    pub fn invalid() -> Self {
        Self { node_id: u32::MAX }
    }

    /// 检查节点是否有效
    pub fn is_valid(&self) -> bool {
        self.node_id != u32::MAX
    }
}

/// AST节点
#[derive(Clone)]
pub struct Node {
    /// 绿色节点引用
    pub green: GreenNode,
    /// 开始位置
    pub start: InputOffset,
    /// 结束位置
    pub end: InputOffset,
}

impl Node {
    /// 创建一个新的AST节点
    pub fn new(green: GreenNode, start: InputOffset, end: InputOffset) -> Self {
        Self { green, start, end }
    }

    /// 获取节点范围
    pub fn range(&self) -> std::ops::Range<InputOffset> {
        self.start..self.end
    }

    /// 获取节点长度
    pub fn length(&self) -> InputOffset {
        self.end - self.start
    }
}

impl fmt::Debug for Node {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("Node")
            .field("green", &self.green)
            .field("range", &format!("{:?}", self.start..self.end))
            .finish()
    }
}

impl PartialEq for Node {
    fn eq(&self, other: &Self) -> bool {
        self.green == other.green && self.start == other.start && self.end == other.end
    }
}

impl Eq for Node {}

impl Hash for Node {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.green.hash(state);
        self.start.hash(state);
        self.end.hash(state);
    }
}