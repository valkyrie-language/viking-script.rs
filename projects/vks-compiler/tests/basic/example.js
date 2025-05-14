/**
 * Viking Script 示例文件
 * 展示代数效应的使用方式
 */

import { createEffect, runWithEffects, createHandler } from 'vks-runtime';

// 定义效应
const useState = createEffect('useState');
const logEffect = createEffect('logEffect');
const myError = createEffect('myError');

// 创建效应处理器
const handler = createHandler({
  'useState': (resume) => {
    console.log('处理 useState 效应');
    return resume(0); // 返回初始状态值0
  },
  'logEffect': (resume, message) => {
    console.log('real log', message);
    return resume(true); // 表示处理成功
  },
  'myError': (resume) => {
    console.log('处理 myError 效应');
    // 可以选择重新抛出错误或者处理它
    throw new Error('自定义错误');
  }
});

// 使用生成器函数模拟 try 块
runWithEffects(function* () {
  // 使用状态效应
  const state = yield useState();
  console.log('状态值:', state);
  
  // 使用日志效应
  yield logEffect('log effect');
  
  try {
    // 尝试使用错误效应
    yield myError();
    console.log('这行不会执行到');
  } catch (error) {
    console.log('捕获到错误:', error.message);
  }
  
  console.log('执行完成');
}, handler);

/**
 * 上面的代码等同于以下Viking Script语法:
 * 
 * try {
 *   raise useState()
 *   console.log('状态值:', state)
 *   
 *   raise logEffect('log effect')
 *   
 *   raise myError()
 *   console.log('这行不会执行到')
 * }
 * handler {
 *   case useState():
 *     console.log('处理 useState 效应')
 *     resume 0
 *   case logEffect(message):
 *     console.log('real log', message)
 *     resume true
 *   case myError():
 *     console.log('处理 myError 效应')
 *     raise new Error('自定义错误')
 * }
 */