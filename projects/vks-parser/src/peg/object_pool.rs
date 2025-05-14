//! 对象池模块
//!
//! 提供了高效的对象分配和复用机制，用于优化解析树的内存使用。

use std::rc::Rc;
use std::cell::RefCell;
use std::collections::HashMap;

use super::ast::{Node, NodeHandle};
use super::language::Language;

/// 对象池工厂，用于创建和管理对象池
pub struct ObjectPoolFactory<L: Language> {
    /// 当前活跃的对象池
    current_pool: Option<Rc<RefCell<ObjectPool<L>>>>,
    /// 可复用的对象池列表
    reusable_pools: Vec<Rc<RefCell<ObjectPool<L>>>>,
}

impl<L: Language> ObjectPoolFactory<L> {
    /// 创建一个新的对象池工厂
    pub fn new() -> Self {
        Self {
            current_pool: None,
            reusable_pools: Vec::new(),
        }
    }
    
    /// 获取或创建当前对象池
    pub fn get_or_create_pool(&mut self) -> Rc<RefCell<ObjectPool<L>>> {
        if let Some(pool) = &self.current_pool {
            return Rc::clone(pool);
        }
        
        let pool = if let Some(pool) = self.reusable_pools.pop() {
            // 复用现有对象池
            pool.borrow_mut().clear();
            pool
        } else {
            // 创建新对象池
            Rc::new(RefCell::new(ObjectPool::new()))
        };
        
        self.current_pool = Some(Rc::clone(&pool));
        pool
    }
    
    /// 释放当前对象池
    pub fn release_current_pool(&mut self) {
        if let Some(pool) = self.current_pool.take() {
            self.reusable_pools.push(pool);
        }
    }
    
    /// 创建一个新节点并返回其句柄
    pub fn create_node(&mut self, node: Node<L>) -> NodeHandle<L> {
        let pool = self.get_or_create_pool();
        let id = pool.borrow_mut().allocate(node);
        NodeHandle::new(id, Rc::clone(&pool))
    }
}

impl<L: Language> Default for ObjectPoolFactory<L> {
    fn default() -> Self {
        Self::new()
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
    
    /// 清除所有数据
    pub fn clear(&mut self) {
        self.nodes.clear();
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