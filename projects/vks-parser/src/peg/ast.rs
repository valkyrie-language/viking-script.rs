//! 抽象语法树模块
//!
//! 提供了解析树的结构定义，包括节点类型、位置信息和红绿树实现。

use std::ops::Range;
use std::rc::Rc;
use std::cell::RefCell;
use std::collections::HashMap;

use super::language::Language;

/// 节点类型，表示解析树中的节点
pub enum Node<L: Language> {
    /// 成功匹配的节点（绿节点）
    Success {
        /// 节点标记（包含kind和tag信息）
        mark: u32,
        /// 节点在输入流中的位置范围
        range: Range<usize>,
        /// 子节点列表
        children: Vec<NodeHandle<L>>,
    },
    /// 失败匹配的节点（红节点）
    Failure {
        /// 错误信息
        message: String,
        /// 错误发生的位置
        position: usize,
        /// 期望的标记
        expected: Option<u32>,
    },
}

impl<L: Language> Node<L> {
    /// 创建一个成功节点
    pub fn success(mark: u32, range: Range<usize>, children: Vec<NodeHandle<L>>) -> Self {
        Node::Success {
            mark,
            range,
            children,
        }
    }
    
    /// 创建一个失败节点
    pub fn failure(message: String, position: usize, expected: Option<u32>) -> Self {
        Node::Failure {
            message,
            position,
            expected,
        }
    }
    
    /// 检查节点是否为成功节点
    pub fn is_success(&self) -> bool {
        matches!(self, Node::Success { .. })
    }
    
    /// 获取节点的位置范围
    pub fn range(&self) -> Option<Range<usize>> {
        match self {
            Node::Success { range, .. } => Some(range.clone()),
            _ => None,
        }
    }
    
    /// 获取节点的标记
    pub fn mark(&self) -> Option<u32> {
        match self {
            Node::Success { mark, .. } => Some(*mark),
            Node::Failure { expected, .. } => *expected,
        }
    }
    
    /// 获取节点的子节点
    pub fn children(&self) -> Option<&Vec<NodeHandle<L>>> {
        match self {
            Node::Success { children, .. } => Some(children),
            _ => None,
        }
    }
    
    /// 获取节点的错误信息
    pub fn error_message(&self) -> Option<&str> {
        match self {
            Node::Failure { message, .. } => Some(message),
            _ => None,
        }
    }
}

/// 节点句柄，用于在对象池中引用节点
pub struct NodeHandle<L: Language> {
    /// 节点ID
    pub id: usize,
    /// 对象池引用
    pub pool: Rc<RefCell<ObjectPool<L>>>,
}

impl<L: Language> NodeHandle<L> {
    /// 创建一个新的节点句柄
    pub fn new(id: usize, pool: Rc<RefCell<ObjectPool<L>>>) -> Self {
        Self { id, pool }
    }
    
    /// 获取节点引用
    pub fn get(&self) -> Option<&Node<L>> {
        self.pool.borrow().get(self.id)
    }
    
    /// 获取节点可变引用
    pub fn get_mut(&mut self) -> Option<&mut Node<L>> {
        self.pool.borrow_mut().get_mut(self.id)
    }
    
    /// 检查节点是否为成功节点
    pub fn is_success(&self) -> bool {
        self.get().map_or(false, |node| node.is_success())
    }
    
    /// 获取节点的位置范围
    pub fn range(&self) -> Option<Range<usize>> {
        self.get().and_then(|node| node.range())
    }
    
    /// 获取节点的标记
    pub fn mark(&self) -> Option<u32> {
        self.get().and_then(|node| node.mark())
    }
    
    /// 获取节点的子节点
    pub fn children(&self) -> Option<&Vec<NodeHandle<L>>> {
        self.get().and_then(|node| node.children())
    }
}

impl<L: Language> Clone for NodeHandle<L> {
    fn clone(&self) -> Self {
        Self {
            id: self.id,
            pool: Rc::clone(&self.pool),
        }
    }
}

/// 对象池，用于管理节点对象的分配和复用
pub struct ObjectPool<L: Language> {
    /// 节点存储
    nodes: Vec<Node<L>>,
    /// 记忆化表，用于缓存解析结果
    memo: HashMap<(usize, u32), usize>, // (offset, rule_id) -> node_id
}

impl<L: Language> ObjectPool<L> {
    /// 创建一个新的对象池
    pub fn new() -> Self {
        Self {
            nodes: Vec::new(),
            memo: HashMap::new(),
        }
    }
    
    /// 分配一个新节点
    pub fn allocate(&mut self, node: Node<L>) -> usize {
        let id = self.nodes.len();
        self.nodes.push(node);
        id
    }
    
    /// 获取节点引用
    pub fn get(&self, id: usize) -> Option<&Node<L>> {
        self.nodes.get(id)
    }
    
    /// 获取节点可变引用
    pub fn get_mut(&mut self, id: usize) -> Option<&mut Node<L>> {
        self.nodes.get_mut(id)
    }
    
    /// 记忆化查询
    pub fn memo_lookup(&self, offset: usize, rule_id: u32) -> Option<usize> {
        self.memo.get(&(offset, rule_id)).copied()
    }
    
    /// 记忆化存储
    pub fn memo_store(&mut self, offset: usize, rule_id: u32, node_id: usize) {
        self.memo.insert((offset, rule_id), node_id);
    }
    
    /// 清除记忆化缓存
    pub fn clear_memo(&mut self) {
        self.memo.clear();
    }
    
    /// 获取节点数量
    pub fn node_count(&self) -> usize {
        self.nodes.len()
    }
    
    /// 创建一个新的节点句柄
    pub fn create_handle(&self, id: usize, pool_rc: Rc<RefCell<Self>>) -> NodeHandle<L> {
        NodeHandle::new(id, pool_rc)
    }
}

impl<L: Language> Default for ObjectPool<L> {
    fn default() -> Self {
        Self::new()
    }
}