/**
 * Viking Script Compiler
 * 主入口文件，导出编译器的所有组件
 */

// 核心编译器
export { Compiler, CompilerOptions, CompilerResult, CompilerError, CompilerWarning } from './compiler';

// 符号表
export { SymbolTable, Scope, VariableInfo, FunctionInfo, ClassInfo, TraitInfo } from './symbol-table';

// 类型检查器
export { TypeChecker, TypeError } from './type-checker';

// CPS 变换器
export { CPSTransformer, CPSNode } from './transformer';

// 代码生成器
export { CodeGenerator, GeneratorOptions, GeneratedCode } from './generator';

// 便捷函数
export function compile(source: string, options: Partial<CompilerOptions> = {}) {
  const compiler = new Compiler();
  return compiler.compileSource(source, options as CompilerOptions);
}

export function compileAST(ast: any, options: Partial<CompilerOptions> = {}) {
  const compiler = new Compiler();
  return compiler.compile(ast, options as CompilerOptions);
}

// 默认导出编译器类
export default Compiler;