# Viking Script Language

Viking Script 是一个编译目标为 JavaScript 的现代动态语言，支持代数效应、模式匹配、生成器、异步编程等高级特性。

## 项目结构

```
projects/
├── vks-hir/          # 高级中间表示 (HIR) - AST 节点定义
├── vks-parser/       # 语法解析器
├── vks-compiler/     # 编译器核心
├── vks-runtime/      # 共享运行时
└── README.md         # 项目说明
```

## 语言特性

### 🔧 基础语法

```viking
# 变量声明
let a = 1;
let mut b = "hello";
b = "world";  # 可变变量

# 函数定义
function add(x: number, y: number) -> number {
    return x + y;
}

# 类定义
class Person {
    name: string = "";
    age: number = 0;
    
    constructor(name: string, age: number) {
        self.name = name;
        self.age = age;
    }
    
    greet() {
        print("Hello, " + self.name);
    }
}
```

### 🎯 模式匹配

```viking
match x {
    case x > 0:
        print("positive");
        fallthrough!
    case x < 0:
        print("negative");
        fallthrough
    case _:
        print("zero");
}
```

### 🔄 循环和控制流

```viking
loop label main {
    if condition {
        break main;
    }
    continue main;
}
```

### 🧬 代数效应

```viking
try {
    let result = divide(10, 0);
    print(result);
} handler {
    case DivideByZeroError:
        resume 0;  # 恢复执行并提供默认值
    case Log(message):
        print("Log: " + message);
}
```

### ⚡ 异步编程

```viking
async function fetchData() {
    let response = fetch("/api/data").await();
    return response.json().await();
}

# 异步等待
fetchData().await();

# 同步等待
fetchData().block_on();

# 启动并忽略
fetchData().fire_then_ignore();
```

### 🔄 生成器

```viking
yield function fibonacci() {
    let a = 0, b = 1;
    loop {
        yield a;
        let temp = a + b;
        a = b;
        b = temp;
    }
}

let fib = fibonacci();
for i in fib.take(10) {
    print(i);
}
```

### 🏗️ 联合类型 (Union Types)

```viking
union Result {
    Ok { value: any }
    Error { message: string }
}

function divide(a: number, b: number) -> Result {
    if b == 0 {
        return Error { message: "Division by zero" };
    }
    return Ok { value: a / b };
}
```

### 🎭 Trait 系统

```viking
trait Display {
    display() -> string;
}

impl Display for Person {
    display() -> string {
        return "Person(" + self.name + ", " + self.age + ")";
    }
}
```

## 编译器架构

### 编译流程

1. **词法分析和语法分析** (`vks-parser`)
   - 将源代码解析为 AST

2. **类型检查** (`vks-compiler/analyzer`)
   - 静态类型推断和检查
   - 类型错误报告

3. **CPS 变换** (`vks-compiler/transformer`)
   - 将 AST 转换为 Continuation Passing Style
   - 支持代数效应和异步操作

4. **代码生成** (`vks-compiler/generator`)
   - 生成可执行的 JavaScript 代码
   - 包含 Source Map 支持

5. **运行时** (`vks-runtime`)
   - 提供 VM 和效应系统
   - 支持高级语言特性

### 核心组件

#### 编译器 (`vks-compiler`)

```typescript
import { compile, compileFile, compileString } from 'vks-compiler';

// 编译单个文件
const result = compileFile('main.viking', sourceCode, {
    sourceMap: true,
    optimize: true,
    target: 'es2020'
});

// 编译多个文件
const multiResult = compile([
    { path: 'main.viking', content: mainCode },
    { path: 'utils.viking', content: utilsCode }
], options);
```

#### 运行时 (`vks-runtime`)

```typescript
import { VM } from 'vks-runtime';

const vm = new VM();

// 运行编译后的代码
vm.run(compiledMainFunction);
```

## 快速开始

### 1. 安装依赖

```bash
# 在每个子项目中安装依赖
cd vks-compiler && npm install
cd ../vks-runtime && npm install
cd ../vks-parser && npm install
cd ../vks-hir && npm install
```

### 2. 构建项目

```bash
# 构建运行时
cd vks-runtime && npm run build

# 构建编译器
cd ../vks-compiler && npm run build
```

### 3. 运行测试

```bash
# 测试编译器
cd vks-compiler && npm run test:compiler

# 测试运行时
cd ../vks-runtime && npm run build && node dist/test/vm-test.js
```

### 4. 编译示例

```bash
# 编译示例文件
cd vks-compiler && npm run compile-example
```

## 开发指南

### 添加新的语言特性

1. **更新 AST 定义** (`vks-hir/src/nodes`)
2. **扩展解析器** (`vks-parser/src`)
3. **实现类型检查** (`vks-compiler/src/analyzer`)
4. **添加 CPS 变换** (`vks-compiler/src/transformer`)
5. **更新代码生成器** (`vks-compiler/src/generator`)
6. **扩展运行时支持** (`vks-runtime/src`)

### 调试技巧

- 使用 `npm run dev` 进行开发时的自动构建
- 查看生成的 JavaScript 代码来理解编译结果
- 使用 Source Map 进行调试
- 运行单元测试验证功能

## 技术特点

### 🔄 Continuation Passing Style (CPS)

所有代码都被转换为 CPS 形式，这使得以下特性成为可能：

- **代数效应**: 通过 continuation 实现效应处理
- **异步编程**: 自然支持 async/await
- **生成器**: 通过暂停和恢复 continuation
- **尾调用优化**: 避免栈溢出

### 🎭 代数效应系统

基于 continuation 的效应系统提供：

- **可组合的错误处理**
- **状态管理**
- **日志记录**
- **异步操作**
- **自定义效应**

### 🔍 静态类型系统

支持：

- **类型推断**
- **泛型**
- **联合类型**
- **交叉类型**
- **Trait 系统**

## 贡献指南

1. Fork 项目
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License

## 相关资源

- [语言规范](./docs/language-spec.md)
- [编译器设计](./docs/compiler-design.md)
- [运行时架构](./docs/runtime-architecture.md)
- [效应系统指南](./docs/effects-guide.md)