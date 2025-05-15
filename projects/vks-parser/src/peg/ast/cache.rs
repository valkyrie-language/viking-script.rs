//! AST节点缓存模块
//!
//! 提供AST节点的缓存机制，支持增量式解析和节点重用。

use std::collections::HashMap;
use std::hash::{Hash, Hasher};
use std::ops::Range;

use crate::inputs::InputOffset;
use super::{Node, GreenNode, NodePool};

/// 节点缓存键
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct NodeCacheKey {
    /// 规则ID
    pub rule_id: u32,
    /// 开始位置
    pub start: InputOffset,
    /// 输入版本号（用于增量式解析）
    pub version: u64,
}

impl NodeCacheKey {
    /// 创建一个新的节点缓存键
    pub fn new(rule_id: u32, start: InputOffset, version: u64) -> Self {
        Self { rule_id, start, version }
    }
}

/// 节点缓存值
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NodeCacheValue {
    /// 节点
    pub node: Option<Node>,
    /// 结束位置
    pub end: InputOffset,
    /// 是否成功匹配
    pub success: bool,
}

impl NodeCacheValue {
    /// 创建一个新的节点缓存值（成功匹配）
    pub fn success(node: Option<Node>, end: InputOffset) -> Self {
        Self { node, end, success: true }
    }

    /// 创建一个新的节点缓存值（匹配失败）
    pub fn failure() -> Self {
        Self { node: None, end: 0, success: false }
    }
}

/// 节点缓存
#[derive(Debug, Clone)]
pub struct NodeCache {
    /// 缓存映射
    cache: HashMap<NodeCacheKey, NodeCacheValue>,
    /// 当前输入版本号
    version: u64,
    /// 缓存命中计数
    hits: usize,
    /// 缓存未命中计数
    misses: usize,
    /// 最大缓存大小
    max_size: usize,
}

impl NodeCache {
    /// 创建一个新的节点缓存
    pub fn new() -> Self {
        Self {
            cache: HashMap::new(),
            version: 0,
            hits: 0,
            misses: 0,
            max_size: 10000, // 默认最大缓存大小
        }
    }

    /// 创建一个新的节点缓存，指定最大缓存大小
    pub fn with_capacity(max_size: usize) -> Self {
        Self {
            cache: HashMap::with_capacity(max_size),
            version: 0,
            hits: 0,
            misses: 0,
            max_size,
        }
    }

    /// 获取缓存项
    pub fn get(&mut self, rule_id: u32, start: InputOffset) -> Option<&NodeCacheValue> {
        let key = NodeCacheKey::new(rule_id, start, self.version);
        let result = self.cache.get(&key);
        
        if result.is_some() {
            self.hits += 1;
        } else {
            self.misses += 1;
        }
        
        result
    }

    /// 设置缓存项
    pub fn set(&mut self, rule_id: u32, start: InputOffset, value: NodeCacheValue) {
        // 如果缓存已满，清理一半的缓存
        if self.cache.len() >= self.max_size {
            self.prune_cache();
        }
        
        let key = NodeCacheKey::new(rule_id, start, self.version);
        self.cache.insert(key, value);
    }

    /// 增加输入版本号
    pub fn increment_version(&mut self) {
        self.version += 1;
    }

    /// 设置输入版本号
    pub fn set_version(&mut self, version: u64) {
        self.version = version;
    }

    /// 获取当前输入版本号
    pub fn version(&self) -> u64 {
        self.version
    }

    /// 清理缓存
    pub fn clear(&mut self) {
        self.cache.clear();
        self.hits = 0;
        self.misses = 0;
    }

    /// 获取缓存命中率
    pub fn hit_rate(&self) -> f64 {
        let total = self.hits + self.misses;
        if total == 0 {
            0.0
        } else {
            self.hits as f64 / total as f64
        }
    }

    /// 获取缓存大小
    pub fn size(&self) -> usize {
        self.cache.len()
    }

    /// 设置最大缓存大小
    pub fn set_max_size(&mut self, max_size: usize) {
        self.max_size = max_size;
        if self.cache.len() > max_size {
            self.prune_cache();
        }
    }

    /// 裁剪缓存（当缓存超过最大大小时）
    fn prune_cache(&mut self) {
        // 简单策略：清理一半的缓存
        // 更复杂的策略可以基于LRU或其他算法
        let keys: Vec<_> = self.cache.keys().cloned().collect();
        let half_size = keys.len() / 2;
        
        for key in keys.into_iter().take(half_size) {
            self.cache.remove(&key);
        }
    }

    /// 检查缓存中是否存在指定范围内的节点
    pub fn has_nodes_in_range(&self, range: Range<InputOffset>) -> bool {
        for (key, value) in &self.cache {
            if let Some(ref node) = value.node {
                // 检查节点是否与范围有重叠
                if node.start < range.end && node.end > range.start {
                    return true;
                }
            }
        }
        false
    }

    /// 使指定范围内的缓存失效
    pub fn invalidate_range(&mut self, range: Range<InputOffset>) {
        let keys_to_remove: Vec<_> = self.cache.iter()
            .filter_map(|(key, value)| {
                if let Some(ref node) = value.node {
                    // 检查节点是否与范围有重叠
                    if node.start < range.end && node.end > range.start {
                        return Some(key.clone());
                    }
                }
                None
            })
            .collect();
        
        for key in keys_to_remove {
            self.cache.remove(&key);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_node_cache() {
        let mut cache = NodeCache::new();
        
        // 测试缓存设置和获取
        let rule_id = 1;
        let start = 0;
        let end = 10;
        
        // 创建一个测试节点
        let mut pool = NodePool::new();
        let green = pool.new_leaf(0, 1, 0, 10);
        let node = Node::new(green, start, end);
        
        // 设置缓存
        cache.set(rule_id, start, NodeCacheValue::success(Some(node.clone()), end));
        
        // 获取缓存
        let cached = cache.get(rule_id, start).unwrap();
        assert!(cached.success);
        assert_eq!(cached.end, end);
        assert_eq!(cached.node.as_ref().unwrap(), &node);
        
        // 测试缓存命中率
        assert_eq!(cache.hits, 1);
        assert_eq!(cache.misses, 0);
        assert_eq!(cache.hit_rate(), 1.0);
        
        // 测试版本增加后缓存失效
        cache.increment_version();
        assert!(cache.get(rule_id, start).is_none());
        assert_eq!(cache.misses, 1);
        
        // 测试范围失效
        cache.set(rule_id, start, NodeCacheValue::success(Some(node.clone()), end));
        cache.invalidate_range(5..15);
        assert!(cache.get(rule_id, start).is_none());
    }
}