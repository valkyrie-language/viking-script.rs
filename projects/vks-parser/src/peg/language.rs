//! 语言特性模块
//!
//! 提供了处理语言特定标记和类型转换的trait和实现。

/// 语言trait，用于将u32标记转换为具体的kind和tag
pub trait Language {
    /// 语言特定的节点类型
    type Kind;
    
    /// 从u32标记获取kind
    fn kind_from_mark(&self, mark: u32) -> Self::Kind;
    
    /// 从u32标记获取tag
    fn tag_from_mark(&self, mark: u32) -> Option<&str>;
    
    /// 创建一个新的标记
    fn create_mark(&self, kind: &Self::Kind, tag: Option<&str>) -> u32;
    
    /// 获取kind的字符串表示
    fn kind_to_string(&self, kind: &Self::Kind) -> String;
    
    /// 解析入口规则
    fn parse_entry(&self, state: &mut crate::peg::parser::ParserState) -> crate::peg::error::Result<Option<crate::peg::ast::Node>>;
    
    /// 获取语言名称
    fn name(&self) -> &str {
        "Generic Language"
    }
    
    /// 获取语言版本
    fn version(&self) -> &str {
        "1.0.0"
    }
}

/// 全局配置，用于存储解析器的全局变量
pub struct GlobalConfig {
    /// 配置项映射
    pub config: std::collections::HashMap<String, String>,
}

impl GlobalConfig {
    /// 创建新的全局配置
    pub fn new() -> Self {
        Self {
            config: std::collections::HashMap::new(),
        }
    }
    
    /// 设置配置项
    pub fn set(&mut self, key: &str, value: &str) -> &mut Self {
        self.config.insert(key.to_string(), value.to_string());
        self
    }
    
    /// 获取配置项
    pub fn get(&self, key: &str) -> Option<&str> {
        self.config.get(key).map(|s| s.as_str())
    }
    
    /// 获取配置项，如果不存在则返回默认值
    pub fn get_or(&self, key: &str, default: &str) -> &str {
        self.get(key).unwrap_or(default)
    }
}

impl Default for GlobalConfig {
    fn default() -> Self {
        Self::new()
    }
}