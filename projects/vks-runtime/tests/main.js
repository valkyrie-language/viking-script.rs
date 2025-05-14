/**
 * Viking Script Runtime 测试文件
 * 测试代数效应运行时的基本功能
 */

import { describe, it, expect } from 'vitest';
import { createEffect, runWithEffects, createHandler } from '../src/index.js';

describe('代数效应运行时', () => {
  // 定义一些测试用的效应
  const useState = createEffect('useState');
  const logEffect = createEffect('logEffect');
  const myError = createEffect('myError');

  it('应该能够正确处理效应并恢复执行', () => {
    // 模拟控制台日志以便测试
    const logs = [];
    const originalConsoleLog = console.log;
    console.log = (...args) => {
      logs.push(args.join(' '));
    };

    // 创建效应处理器
    const handlers = {
      'useState': () => 42,  // 返回状态值42
      'logEffect': (message) => {
        console.log('real log', message);
        return true; // 表示处理成功
      },
      'myError': () => {
        throw new Error('自定义错误');
      }
    };

    // 运行带有效应的代码
    function* effectfulCode() {
      // 使用状态效应
      const state = yield useState();
      expect(state).toBe(42);

      // 使用日志效应
      const logResult = yield logEffect('log effect');
      expect(logResult).toBe(true);

      // 尝试捕获错误效应
      try {
        yield myError();
        // 不应该执行到这里
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toBe('自定义错误');
      }

      return 'completed';
    }

    // 执行带有效应处理的代码
    const result = runWithEffects(effectfulCode, handlers);
    expect(result).toBe('completed');
    expect(logs).toContain('real log log effect');

    // 恢复控制台日志
    console.log = originalConsoleLog;
  });

  it('应该能够嵌套处理效应', () => {
    // 创建嵌套的效应处理器
    const outerHandlers = {
      'useState': () => 100
    };

    const innerHandlers = {
      'logEffect': (message) => {
        return `logged: ${message}`;
      }
    };

    // 外层生成器
    function* outerCode() {
      const state = yield useState();
      
      // 内层生成器使用不同的处理器
      const innerResult = runWithEffects(function* () {
        const logResult = yield logEffect('inner message');
        return { logResult, state };
      }, innerHandlers);
      
      return innerResult;
    }

    // 执行带有嵌套效应的代码
    const result = runWithEffects(outerCode, outerHandlers);
    
    expect(result.logResult).toBe('logged: inner message');
    expect(result.state).toBe(100);
  });

  it('应该能够处理未捕获的效应', () => {
    // 没有处理器的效应
    const unhandledEffect = createEffect('unhandled');

    function* effectfulCode() {
      yield unhandledEffect();
      return 'completed';
    }

    // 应该抛出未处理的效应错误
    expect(() => runWithEffects(effectfulCode, {})).toThrow('未处理的效应: unhandled');
  });
});

// 示例：模拟try-handler语法的使用
describe('try-handler语法示例', () => {
  it('应该能够模拟try-handler语法', () => {
    // 定义效应
    const useState = createEffect('useState');
    const logEffect = createEffect('logEffect');
    const myError = createEffect('myError');
    
    // 创建处理器
    const handlers = {
      'useState': () => 0,
      'logEffect': (message) => {
        console.log('real log', message);
      },
      'myError': () => {
        // 重新抛出效应
        throw new Error('处理的错误');
      }
    };
    
    // 模拟try块
    function* tryBlock() {
      yield useState();
      yield logEffect('log effect');
      try {
        yield myError();
      } catch (e) {
        expect(e.message).toBe('处理的错误');
      }
      return 'success';
    }
    
    // 运行带有效应处理的代码
    const result = runWithEffects(tryBlock, handlers);
    expect(result).toBe('success');
  });
});