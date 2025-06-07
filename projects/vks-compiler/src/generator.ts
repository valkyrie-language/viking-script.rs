import { SourceMapGenerator } from 'source-map';
import { CPSNode, CPSExpression, CPSStatement, CPSFunction, CPSCall, CPSLiteral, CPSVariable, CPSBinary } from './transformer';
import { Location } from '../../vks-hir/src/nodes';

export interface GeneratorOptions {
  sourceMap?: boolean;
  sourceFileName?: string;
  outputFileName?: string;
  minify?: boolean;
  runtimePath?: string;
}

export interface GeneratedCode {
  code: string;
  sourceMap?: string;
}

export class CodeGenerator {
  private sourceMap?: SourceMapGenerator;
  private options: GeneratorOptions;
  private indentLevel: number = 0;
  private output: string[] = [];
  private currentLine: number = 1;
  private currentColumn: number = 0;

  constructor(options: GeneratorOptions = {}) {
    this.options = {
      sourceMap: true,
      runtimePath: './runtime/vm.js',
      ...options
    };

    if (this.options.sourceMap && this.options.sourceFileName && this.options.outputFileName) {
      this.sourceMap = new SourceMapGenerator({
        file: this.options.outputFileName,
        sourceRoot: ''
      });
    }
  }

  generate(node: CPSNode): GeneratedCode {
    this.output = [];
    this.currentLine = 1;
    this.currentColumn = 0;
    this.indentLevel = 0;

    // 生成运行时导入
    this.emit(`const VM = require('${this.options.runtimePath}');\n`);
    this.emit(`const { Effects } = require('${this.options.runtimePath}/effects');\n\n`);

    // 生成主函数
    this.emit('const main = ');
    this.visitNode(node);
    this.emit(';\n\n');

    // 生成启动代码
    this.emit('// 启动 Viking 程序\n');
    this.emit('VM.run(main);\n');

    const code = this.output.join('');
    const sourceMap = this.sourceMap ? this.sourceMap.toString() : undefined;

    return { code, sourceMap };
  }

  private visitNode(node: CPSNode): void {
    switch (node.type) {
      case 'CPSFunction':
        this.visitFunction(node as CPSFunction);
        break;
      case 'CPSCall':
        this.visitCall(node as CPSCall);
        break;
      case 'CPSLiteral':
        this.visitLiteral(node as CPSLiteral);
        break;
      case 'CPSVariable':
        this.visitVariable(node as CPSVariable);
        break;
      case 'CPSBinary':
        this.visitBinary(node as CPSBinary);
        break;
      case 'CPSAssignment':
        this.visitAssignment(node as any);
        break;
      case 'CPSReturn':
        this.visitReturn(node as any);
        break;
      case 'CPSIf':
        this.visitIf(node as any);
        break;
      case 'CPSLoop':
        this.visitLoop(node as any);
        break;
      case 'CPSBreak':
        this.visitBreak(node as any);
        break;
      case 'CPSContinue':
        this.visitContinue(node as any);
        break;
      case 'CPSYield':
        this.visitYield(node as any);
        break;
      case 'CPSAwait':
        this.visitAwait(node as any);
        break;
      case 'CPSRaise':
        this.visitRaise(node as any);
        break;
      case 'CPSHandler':
        this.visitHandler(node as any);
        break;
      case 'CPSBlock':
        this.visitBlock(node as any);
        break;
      case 'CPSExpressionStatement':
        this.visitExpressionStatement(node as any);
        break;
      case 'CPSVariableDeclaration':
        this.visitVariableDeclaration(node as any);
        break;
      default:
        throw new Error(`Unsupported CPS node type: ${node.type}`);
    }
  }

  private visitFunction(node: CPSFunction): void {
    this.addSourceMapping(node.location);
    
    if (node.isAsync) {
      this.emit('async ');
    }
    
    this.emit('(');
    this.emit(node.params.join(', '));
    this.emit(') => {\n');
    
    this.indent();
    
    if (node.isGenerator) {
      this.emitIndented('// Generator function\n');
      this.emitIndented('const _generator = {\n');
      this.indent();
      this.emitIndented('next: (_value) => {\n');
      this.indent();
    }
    
    // 函数体
    for (const stmt of node.body) {
      this.visitNode(stmt);
    }
    
    if (node.isGenerator) {
      this.dedent();
      this.emitIndented('},\n');
      this.emitIndented('send: (_value) => _generator.next(_value),\n');
      this.emitIndented('throw: (_error) => { throw _error; }\n');
      this.dedent();
      this.emitIndented('};\n');
      this.emitIndented('return _generator;\n');
    }
    
    this.dedent();
    this.emit('}');
  }

  private visitCall(node: CPSCall): void {
    this.addSourceMapping(node.location);
    
    // CPS 调用：callee(arg1, arg2, ..., continuation, handler)
    this.visitNode(node.callee);
    this.emit('(');
    
    // 参数
    for (let i = 0; i < node.arguments.length; i++) {
      if (i > 0) this.emit(', ');
      this.visitNode(node.arguments[i]);
    }
    
    if (node.arguments.length > 0) {
      this.emit(', ');
    }
    
    // continuation
    this.visitNode(node.continuation);
    this.emit(', _h)');
  }

  private visitLiteral(node: CPSLiteral): void {
    this.addSourceMapping(node.location);
    
    if (typeof node.value === 'string') {
      this.emit(JSON.stringify(node.value));
    } else if (node.value === null) {
      this.emit('null');
    } else if (node.value === undefined) {
      this.emit('undefined');
    } else {
      this.emit(String(node.value));
    }
  }

  private visitVariable(node: CPSVariable): void {
    this.addSourceMapping(node.location);
    this.emit(node.name);
  }

  private visitBinary(node: CPSBinary): void {
    this.addSourceMapping(node.location);
    
    this.emit('(');
    this.visitNode(node.left);
    this.emit(` ${node.operator} `);
    this.visitNode(node.right);
    this.emit(')');
  }

  private visitAssignment(node: any): void {
    this.addSourceMapping(node.location);
    
    this.emitIndented(`${node.target} = `);
    this.visitNode(node.value);
    this.emit(';\n');
  }

  private visitReturn(node: any): void {
    this.addSourceMapping(node.location);
    
    this.emitIndented('_k(');
    this.visitNode(node.value);
    this.emit(', _h);\n');
  }

  private visitIf(node: any): void {
    this.addSourceMapping(node.location);
    
    this.emitIndented('if (');
    this.visitNode(node.test);
    this.emit(') {\n');
    
    this.indent();
    for (const stmt of node.consequent) {
      this.visitNode(stmt);
    }
    this.dedent();
    
    if (node.alternate) {
      this.emitIndented('} else {\n');
      this.indent();
      for (const stmt of node.alternate) {
        this.visitNode(stmt);
      }
      this.dedent();
    }
    
    this.emitIndented('}\n');
  }

  private visitLoop(node: any): void {
    this.addSourceMapping(node.location);
    
    const label = node.label;
    this.emitIndented(`${label}: while (true) {\n`);
    
    this.indent();
    for (const stmt of node.body) {
      this.visitNode(stmt);
    }
    this.dedent();
    
    this.emitIndented('}\n');
  }

  private visitBreak(node: any): void {
    this.addSourceMapping(node.location);
    
    if (node.label) {
      this.emitIndented(`break ${node.label};\n`);
    } else {
      this.emitIndented('break;\n');
    }
  }

  private visitContinue(node: any): void {
    this.addSourceMapping(node.location);
    
    if (node.label) {
      this.emitIndented(`continue ${node.label};\n`);
    } else {
      this.emitIndented('continue;\n');
    }
  }

  private visitYield(node: any): void {
    this.addSourceMapping(node.location);
    
    this.emitIndented('return VM.yield(');
    if (node.value) {
      this.visitNode(node.value);
    } else {
      this.emit('undefined');
    }
    this.emit(', _k, _h');
    if (node.delegate) {
      this.emit(', true');
    }
    this.emit(');\n');
  }

  private visitAwait(node: any): void {
    this.addSourceMapping(node.location);
    
    this.emitIndented('return VM.await(');
    this.visitNode(node.value);
    this.emit(', _k, _h);\n');
  }

  private visitRaise(node: any): void {
    this.addSourceMapping(node.location);
    
    this.emitIndented('return Effects.raise(');
    this.visitNode(node.effect);
    this.emit(', _k, _h);\n');
  }

  private visitHandler(node: any): void {
    this.addSourceMapping(node.location);
    
    this.emitIndented('return Effects.withHandler({\n');
    this.indent();
    
    // 处理器案例
    this.emitIndented('cases: [\n');
    this.indent();
    
    for (const handlerCase of node.cases) {
      this.emitIndented('{\n');
      this.indent();
      
      this.emitIndented('pattern: ');
      this.visitNode(handlerCase.pattern);
      this.emit(',\n');
      
      this.emitIndented('action: (_effect, _resume, _k, _h) => {\n');
      this.indent();
      
      for (const stmt of handlerCase.action) {
        this.visitNode(stmt);
      }
      
      this.dedent();
      this.emitIndented('}\n');
      
      this.dedent();
      this.emitIndented('},\n');
    }
    
    this.dedent();
    this.emitIndented(']\n');
    
    this.dedent();
    this.emitIndented('}, () => {\n');
    
    this.indent();
    for (const stmt of node.body) {
      this.visitNode(stmt);
    }
    this.dedent();
    
    this.emitIndented('}, _k, _h);\n');
  }

  private visitBlock(node: any): void {
    for (const stmt of node.body) {
      this.visitNode(stmt);
    }
  }

  private visitExpressionStatement(node: any): void {
    this.addSourceMapping(node.location);
    
    this.emitIndented('');
    this.visitNode(node.expression);
    this.emit(';\n');
  }

  private visitVariableDeclaration(node: any): void {
    this.addSourceMapping(node.location);
    
    const keyword = node.kind === 'mut' ? 'let' : 'const';
    
    for (const decl of node.declarations) {
      this.emitIndented(`${keyword} `);
      this.visitNode(decl);
      this.emit(';\n');
    }
  }

  // 辅助方法
  private emit(text: string): void {
    this.output.push(text);
    
    // 更新行列位置
    for (const char of text) {
      if (char === '\n') {
        this.currentLine++;
        this.currentColumn = 0;
      } else {
        this.currentColumn++;
      }
    }
  }

  private emitIndented(text: string): void {
    const indent = '  '.repeat(this.indentLevel);
    this.emit(indent + text);
  }

  private indent(): void {
    this.indentLevel++;
  }

  private dedent(): void {
    if (this.indentLevel > 0) {
      this.indentLevel--;
    }
  }

  private addSourceMapping(location: Location): void {
    if (this.sourceMap && this.options.sourceFileName) {
      this.sourceMap.addMapping({
        generated: {
          line: this.currentLine,
          column: this.currentColumn
        },
        original: {
          line: location.start.line,
          column: location.start.column
        },
        source: this.options.sourceFileName
      });
    }
  }
}