# Viking Script 运行时

这是一个基于JavaScript生成器实现的代数效应运行时库。它提供了一种简洁的方式来处理副作用，使代码更加模块化和可测试。

## 功能特性

- 支持效应定义（Effect Definition）
- 支持效应触发（Effect Raise）
- 支持效应处理（Effect Handler）
- 支持恢复执行（Resume）

## 使用方法

### 基本用法

```javascript
import { createEffect, runWithEffects, createHandler } from 'vks-runtime';

// 定义效应
const useState = createEffect('useState');
const logEffect = createEffect('logEffect');

// 创建效应处理器
const handler = createHandler({
  'useState': (resume) => {
    return resume(0); // 返回初始状态值0
  },
  'logEffect': (resume, message) => {
    console.log('日志:', message);
    return resume(true);
  }
});

// 使用生成器函数运行带有效应的代码
runWithEffects(function* () {
  // 使用状态效应
  const state = yield useState();
  console.log('状态值:', state);
  
  // 使用日志效应
  yield logEffect('这是一条日志');
  
  return '执行完成';
}, handler);
```

### 错误处理

```javascript
import { createEffect, runWithEffects, createHandler } from 'vks-runtime';

// 定义错误效应
const myError = createEffect('myError');

// 创建效应处理器
const handler = createHandler({
  'myError': (resume) => {
    throw new Error('自定义错误');
  }
});

// 使用生成器函数运行带有效应的代码
runWithEffects(function* () {
  try {
    yield myError();
    console.log('这行不会执行到');
  } catch (error) {
    console.log('捕获到错误:', error.message);
  }
  
  return '执行完成';
}, handler);
```

## 与Viking Script编译器集成

Viking Script编译器可以将特定语法转换为使用此运行时的JavaScript代码。例如：

```
try {
  raise useState()
  raise logEffect("log effect")
  raise myError()
}
handler {
  case useState():
    resume 0
  case logEffect(e):
    console.log('real log' + e)
  case myError()
    raise myError()
}
```

会被编译为：

```javascript
import { createEffect, runWithEffects, createHandler } from 'vks-runtime';

const useState = createEffect('useState');
const logEffect = createEffect('logEffect');
const myError = createEffect('myError');

const handler = createHandler({
  'useState': (resume) => {
    return resume(0);
  },
  'logEffect': (resume, e) => {
    console.log('real log' + e);
  },
  'myError': (resume) => {
    yield myError();
  },
});

runWithEffects(function* () {
  yield useState();
  yield logEffect("log effect");
  yield myError();
}, handler);
```

## 测试

运行测试：

```bash
npm test
```