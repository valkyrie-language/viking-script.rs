/**
 * @fileoverview 代数效应运行时模块入口
 */

// 导出所有运行时功能
export {
  raise,
  effectful,
  runWithHandler,
  createHandler,
  createEffect,
  // 示例效应
  useState,
  logEffect,
  myError,
  // 测试功能
  runTest
} from './src/index.ts';

// 导出测试函数
export { runAllTests } from './src/test.js';