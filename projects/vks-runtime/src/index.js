/**
 * Viking Script Runtime - 代数效应运行时
 * 基于JavaScript生成器实现的代数效应系统
 */

/**
 * 效应处理上下文
 */
class EffectContext {
  constructor(handlers = {}) {
    this.handlers = handlers;
    this.parent = null;
  }

  /**
   * 设置父上下文
   */
  setParent(parent) {
    this.parent = parent;
    return this;
  }

  /**
   * 处理效应
   */
  handleEffect(effect, ...args) {
    const effectType = effect.toString();
    
    // 检查当前上下文是否有对应的处理器
    if (this.handlers[effectType]) {
      return this.handlers[effectType](...args);
    }
    
    // 如果没有，尝试委托给父上下文
    if (this.parent) {
      return this.parent.handleEffect(effect, ...args);
    }
    
    // 如果没有处理器，抛出未处理的效应错误
    throw new Error(`未处理的效应: ${effectType}`);
  }
}

/**
 * 创建效应
 */
function createEffect(name) {
  const effect = (...args) => {
    // 效应函数本身不做任何事情，只是作为标识符
    return { effect, args };
  };
  
  // 设置效应名称
  effect.toString = () => name;
  
  return effect;
}

/**
 * 运行带有效应处理的代码
 */
function runWithEffects(generator, handlers = {}) {
  const context = new EffectContext(handlers);
  
  // 如果传入的是函数而不是生成器，则执行函数获取生成器
  const iter = typeof generator === 'function' ? generator() : generator;
  
  return processNext();
  
  function processNext(value) {
    let result;
    
    try {
      result = iter.next(value);
    } catch (error) {
      throw error;
    }
    
    if (result.done) {
      return result.value;
    }
    
    // 检查是否是效应
    if (result.value && result.value.effect) {
      const { effect, args } = result.value;
      
      try {
        // 处理效应并获取结果
        const effectResult = context.handleEffect(effect, ...args);
        
        // 使用效应处理结果继续执行生成器
        return processNext(effectResult);
      } catch (error) {
        // 如果效应处理抛出错误，将错误传递给生成器
        try {
          const errorResult = iter.throw(error);
          
          if (errorResult.done) {
            return errorResult.value;
          }
          
          return processNext(errorResult.value);
        } catch (generatorError) {
          throw generatorError;
        }
      }
    }
    
    // 如果不是效应，继续处理下一个值
    return processNext(result.value);
  }
}

/**
 * 创建效应处理器
 */
function createHandler(handlers) {
  return handlers;
}

/**
 * 运行带有try/handler块的代码
 */
function run(fn) {
  return runWithEffects(fn);
}

export {
  createEffect,
  runWithEffects,
  createHandler,
  run,
  EffectContext
};