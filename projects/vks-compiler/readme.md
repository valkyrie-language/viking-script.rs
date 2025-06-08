# Viking Script Compiler

Viking Script 是一个编译到 JavaScript 的动态语言，具有丰富的现代语言特性。

## 特性

### 核心语言特性
- **变量声明**: `let`, `const`, `mut` 关键字支持
- **模式匹配**: 强大的 `match` 表达式和模式
- **类和联合类型**: 面向对象编程和代数数据类型
- **Trait 系统**: 类似 Rust 的 trait 和 impl
- **生成器**: `yield` 函数支持
- **异步编程**: `async`/`await` 语法
- **代数效应**: 现代的错误处理和控制流
- **Continuation**: `callcc` 支持
- **类型编程**: 编译时类型计算
- **元编程**: 宏系统

### 编译器特性
- **TypeScript 实现**: 完整的编译器工具链
- **Source Map 支持**: 调试友好
- **CPS 变换**: 支持高级控制流特性
- **共享运行时**: JavaScript 运行时支持
- **错误恢复**: 友好的错误报告

## 安装

```bash
npm install
npm run build
```

## 使用方法

### 基本编译

```typescript
import { compile } from './src';

const source = `
let mut x = 1;
x = x + 1;
print(x);
`;

const result = compile(source, {
  filename: 'example.vks',
  sourceMap: true
});

if (result.success) {
  console.log('Generated JavaScript:');
  console.log(result.code);
} else {
  console.error('Compilation errors:');
  result.errors.forEach(error => {
    console.error(`${error.location?.file}:${error.location?.start.line}:${error.location?.start.column} - ${error.message}`);
  });
}
```

### 编译选项

```typescript
const options = {
  filename: 'input.vks',
  sourceMap: true,
  optimize: false,
  strict: true,
  target: 'es2020' as const,
  typeCheck: true,
  runtimePath: './runtime/vm.js',
  emitTokens: false,
  emitAST: false,
  emitCPS: false
};
```

### 运行生成的代码

```javascript
const VM = require('./src/runtime/vm.js');

// 假设编译生成的代码导出了 main 函数
const generatedCode = result.code;
eval(generatedCode);

// 运行主函数
VM.run(main);
```

## 语言语法

### 变量声明

```viking
let a = 1;          # 不可变变量
let mut b = "hello"; # 可变变量
const PI = 3.14159;  # 常量
```

### 函数

```viking
function add(a: number, b: number) -> number {
    return a + b;
}

# 异步函数
async function fetchData(url: string) -> Promise<string> {
    let response = fetch(url).await();
    return response.text().await();
}

# 生成器函数
yield function fibonacci() {
    let a = 0;
    let b = 1;
    loop {
        yield a;
        let temp = a + b;
        a = b;
        b = temp;
    }
}
```

### 类和联合类型

```viking
class Person {
    name: string = "";
    age: number = 0;
    
    constructor(name: string, age: number) {
        self.name = name;
        self.age = age;
    }
    
    greet() {
        print("Hello, I'm " + self.name);
    }
}

union Option<T> {
    Some { value: T }
    None
}
```

### 模式匹配

```viking
match value {
    case Some { value }:
        print("Got value: " + value);
    case None:
        print("No value");
    case x if x > 10:
        print("Large number: " + x);
    case _:
        print("Something else");
}
```

### Trait 系统

```viking
trait Display {
    display() -> string;
}

impl Display for Person {
    display() -> string {
        return self.name + " (" + self.age + ")";
    }
}
```

### 代数效应

```viking
# 定义效应处理器
let handler = handler {
    case DivideByZeroError:
        resume 0;
    case Log(message):
        print("[LOG] " + message);
        resume;
};

# 使用效应
try {
    let result = 10 / 0;  # 会触发 DivideByZeroError
    raise Log("Calculation completed");
} handler;
```

## 架构设计

### 编译流程

1. **词法分析** (`Lexer`): 源代码 → Token 流
2. **语法分析** (`Parser`): Token 流 → AST
3. **语义分析** (`TypeChecker`): AST → 类型检查的 AST
4. **CPS 变换** (`CPSTransformer`): AST → CPS AST
5. **代码生成** (`CodeGenerator`): CPS AST → JavaScript 代码

### CPS (Continuation-Passing Style)

编译器将 Viking 代码转换为 CPS 形式，每个函数都接受三个参数：
- `value`: 上一步操作的结果
- `k`: Continuation 函数
- `h`: Effect Handler 栈

```javascript
// 生成的 JavaScript 代码示例
function main(value, k, h) {
    // Viking: let x = 1 + 2;
    return VM.add(1, 2, (result, h2) => {
        return VM.assign('x', result, (_, h3) => {
            return k(undefined, h3);
        }, h2);
    }, h);
}
```

### 运行时系统

运行时提供：
- **虚拟机** (`VM`): CPS 执行环境
- **效应系统** (`Effects`): 代数效应处理
- **内置函数**: 基础操作和 I/O
- **类型系统**: 运行时类型检查

## 开发

### 项目结构

```
src/
├── ast/                 # AST 节点定义
│   ├── index.ts
│   ├── expression.ts
│   ├── statement.ts
│   ├── literal.ts
│   ├── pattern.ts
│   └── type.ts
├── lexer.ts            # 词法分析器
├── index.ts           # 语法分析器
├── symbol-table.ts     # 符号表管理
├── type-checker.ts     # 类型检查器
├── cps.ts      # CPS 变换器
├── generator.ts        # 代码生成器
├── compiler.ts         # 编译器主入口
├── runtime/            # 运行时系统
│   ├── vm.js          # 虚拟机
│   └── effects.js     # 效应系统
└── index.ts           # 导出接口
```

### 构建

```bash
npm run build    # 编译 TypeScript
npm run test     # 运行测试
npm run dev      # 开发模式
```

### 测试

```bash
npm test
```

## 示例

查看 `examples/` 目录中的示例代码：

- `basic.vks` - 基本语法示例
- `classes.vks` - 类和继承
- `effects.vks` - 代数效应
- `async.vks` - 异步编程
- `generators.vks` - 生成器
- `patterns.vks` - 模式匹配

## 贡献

欢迎贡献代码！请确保：

1. 遵循 TypeScript 代码规范
2. 添加适当的测试
3. 更新文档
4. 通过所有现有测试

## 许可证

MIT License

## 路线图

- [ ] 完善语法分析器
- [ ] 实现完整的类型系统
- [ ] 优化 CPS 变换
- [ ] 添加更多内置函数
- [ ] 性能优化
- [ ] 调试器支持
- [ ] 包管理系统
- [ ] 标准库

## 相关资源

- [语言规范](./docs/language-spec.md)
- [API 文档](./docs/api.md)
- [贡献指南](./CONTRIBUTING.md)
- [更新日志](./CHANGELOG.md)