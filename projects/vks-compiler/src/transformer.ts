import { ASTNode, Statement, Expression, Location } from './ast';
import * as AST from './ast';
import { SymbolTable } from './symbol-table';

export interface CPSNode {
  type: string;
  location: Location;
  meta?: any;
}

export interface CPSExpression extends CPSNode {
  // CPS 表达式：(value, k, h) => { ... }
}

export interface CPSStatement extends CPSNode {
  // CPS 语句
}

export interface CPSFunction extends CPSExpression {
  type: 'CPSFunction';
  params: string[];
  body: CPSStatement[];
  isAsync: boolean;
  isGenerator: boolean;
}

export interface CPSCall extends CPSExpression {
  type: 'CPSCall';
  callee: CPSExpression;
  arguments: CPSExpression[];
  continuation: CPSExpression;
}

export interface CPSLiteral extends CPSExpression {
  type: 'CPSLiteral';
  value: any;
}

export interface CPSVariable extends CPSExpression {
  type: 'CPSVariable';
  name: string;
}

export interface CPSBinary extends CPSExpression {
  type: 'CPSBinary';
  operator: string;
  left: CPSExpression;
  right: CPSExpression;
}

export interface CPSAssignment extends CPSStatement {
  type: 'CPSAssignment';
  target: string;
  value: CPSExpression;
}

export interface CPSReturn extends CPSStatement {
  type: 'CPSReturn';
  value: CPSExpression;
}

export interface CPSIf extends CPSStatement {
  type: 'CPSIf';
  test: CPSExpression;
  consequent: CPSStatement[];
  alternate?: CPSStatement[];
}

export interface CPSMatch extends CPSStatement {
  type: 'CPSMatch';
  discriminant: CPSExpression;
  cases: CPSMatchCase[];
}

export interface CPSMatchCase {
  pattern: CPSExpression;
  guard?: CPSExpression;
  body: CPSStatement[];
  fallthrough?: boolean;
}

export interface CPSLoop extends CPSStatement {
  type: 'CPSLoop';
  label?: string;
  body: CPSStatement[];
}

export interface CPSBreak extends CPSStatement {
  type: 'CPSBreak';
  label?: string;
}

export interface CPSContinue extends CPSStatement {
  type: 'CPSContinue';
  label?: string;
}

export interface CPSYield extends CPSExpression {
  type: 'CPSYield';
  value?: CPSExpression;
  delegate: boolean;
}

export interface CPSAwait extends CPSExpression {
  type: 'CPSAwait';
  value: CPSExpression;
}

export interface CPSRaise extends CPSStatement {
  type: 'CPSRaise';
  effect: CPSExpression;
}

export interface CPSHandler extends CPSStatement {
  type: 'CPSHandler';
  body: CPSStatement[];
  cases: CPSHandlerCase[];
}

export interface CPSHandlerCase {
  pattern: CPSExpression;
  action: CPSStatement[];
  resume?: boolean;
}

export class CPSTransformer {
  private symbolTable: SymbolTable;
  private nextVarId: number = 0;
  private nextLabelId: number = 0;
  private currentFunction?: string;
  private loopStack: string[] = [];

  constructor(symbolTable: SymbolTable) {
    this.symbolTable = symbolTable;
  }

  transform(node: ASTNode): CPSNode {
    return this.visitNode(node);
  }

  private visitNode(node: ASTNode): CPSNode {
    switch (node.type) {
      case 'Program':
        return this.visitProgram(node as AST.Program);
      case 'NumberLiteral':
      case 'StringLiteral':
      case 'BooleanLiteral':
      case 'NullLiteral':
      case 'UndefinedLiteral':
        return this.visitLiteral(node as AST.Literal);
      case 'Identifier':
        return this.visitIdentifier(node as AST.Identifier);
      case 'BinaryExpression':
        return this.visitBinaryExpression(node as AST.BinaryExpression);
      case 'UnaryExpression':
        return this.visitUnaryExpression(node as AST.UnaryExpression);
      case 'AssignmentExpression':
        return this.visitAssignmentExpression(node as AST.AssignmentExpression);
      case 'CallExpression':
        return this.visitCallExpression(node as AST.CallExpression);
      case 'MemberExpression':
        return this.visitMemberExpression(node as AST.MemberExpression);
      case 'ArrayExpression':
        return this.visitArrayExpression(node as AST.ArrayExpression);
      case 'ObjectExpression':
        return this.visitObjectExpression(node as AST.ObjectExpression);
      case 'FunctionExpression':
        return this.visitFunctionExpression(node as AST.FunctionExpression);
      case 'ArrowFunctionExpression':
        return this.visitArrowFunctionExpression(node as AST.ArrowFunctionExpression);
      case 'YieldExpression':
        return this.visitYieldExpression(node as AST.YieldExpression);
      case 'AwaitExpression':
        return this.visitAwaitExpression(node as AST.AwaitExpression);
      case 'MatchExpression':
        return this.visitMatchExpression(node as AST.MatchExpression);
      case 'BlockStatement':
        return this.visitBlockStatement(node as AST.BlockStatement);
      case 'ExpressionStatement':
        return this.visitExpressionStatement(node as AST.ExpressionStatement);
      case 'VariableDeclaration':
        return this.visitVariableDeclaration(node as AST.VariableDeclaration);
      case 'FunctionDeclaration':
        return this.visitFunctionDeclaration(node as AST.FunctionDeclaration);
      case 'ClassDeclaration':
        return this.visitClassDeclaration(node as AST.ClassDeclaration);
      case 'UnionDeclaration':
        return this.visitUnionDeclaration(node as AST.UnionDeclaration);
      case 'TraitDeclaration':
        return this.visitTraitDeclaration(node as AST.TraitDeclaration);
      case 'ImplDeclaration':
        return this.visitImplDeclaration(node as AST.ImplDeclaration);
      case 'IfStatement':
        return this.visitIfStatement(node as AST.IfStatement);
      case 'MatchStatement':
        return this.visitMatchStatement(node as AST.MatchStatement);
      case 'LoopStatement':
        return this.visitLoopStatement(node as AST.LoopStatement);
      case 'BreakStatement':
        return this.visitBreakStatement(node as AST.BreakStatement);
      case 'ContinueStatement':
        return this.visitContinueStatement(node as AST.ContinueStatement);
      case 'ReturnStatement':
        return this.visitReturnStatement(node as AST.ReturnStatement);
      case 'TryStatement':
        return this.visitTryStatement(node as AST.TryStatement);
      case 'HandlerStatement':
        return this.visitHandlerStatement(node as AST.HandlerStatement);
      case 'RaiseStatement':
        return this.visitRaiseStatement(node as AST.RaiseStatement);
      default:
        throw new Error(`Unsupported node type for CPS transformation: ${node.type}`);
    }
  }

  private visitProgram(node: AST.Program): CPSFunction {
    const body = node.body.map(stmt => this.visitNode(stmt) as CPSStatement);
    
    return {
      type: 'CPSFunction',
      params: ['_value', '_k', '_h'],
      body,
      isAsync: false,
      isGenerator: false,
      location: node.location
    };
  }

  private visitLiteral(node: AST.Literal): CPSLiteral {
    return {
      type: 'CPSLiteral',
      value: node.value,
      location: node.location
    };
  }

  private visitIdentifier(node: AST.Identifier): CPSVariable {
    const compiledName = this.symbolTable.generateCompiledName(node.name, node.namespace);
    
    return {
      type: 'CPSVariable',
      name: compiledName,
      location: node.location
    };
  }

  private visitBinaryExpression(node: AST.BinaryExpression): CPSBinary {
    const left = this.visitNode(node.left) as CPSExpression;
    const right = this.visitNode(node.right) as CPSExpression;
    
    return {
      type: 'CPSBinary',
      operator: node.operator,
      left,
      right,
      location: node.location
    };
  }

  private visitUnaryExpression(node: AST.UnaryExpression): CPSExpression {
    // 简化实现
    const argument = this.visitNode(node.argument) as CPSExpression;
    
    return {
      type: 'CPSBinary', // 重用二元表达式结构
      operator: node.operator,
      left: argument,
      right: { type: 'CPSLiteral', value: null, location: node.location },
      location: node.location
    } as CPSBinary;
  }

  private visitAssignmentExpression(node: AST.AssignmentExpression): CPSAssignment {
    const value = this.visitNode(node.right) as CPSExpression;
    
    if (node.left.type === 'Identifier') {
      const identifier = node.left as AST.Identifier;
      const compiledName = this.symbolTable.generateCompiledName(identifier.name, identifier.namespace);
      
      return {
        type: 'CPSAssignment',
        target: compiledName,
        value,
        location: node.location
      };
    }
    
    throw new Error('Complex assignment targets not yet supported');
  }

  private visitCallExpression(node: AST.CallExpression): CPSCall {
    const callee = this.visitNode(node.callee) as CPSExpression;
    const args = node.arguments.map(arg => this.visitNode(arg) as CPSExpression);
    
    // 生成 continuation
    const contVar = this.generateTempVar();
    const continuation: CPSExpression = {
      type: 'CPSFunction',
      params: [contVar, '_h'],
      body: [],
      isAsync: false,
      isGenerator: false,
      location: node.location
    };
    
    return {
      type: 'CPSCall',
      callee,
      arguments: args,
      continuation,
      location: node.location
    };
  }

  private visitFunctionExpression(node: AST.FunctionExpression): CPSFunction {
    const oldFunction = this.currentFunction;
    this.currentFunction = node.id?.name || this.generateTempVar();
    
    this.symbolTable.enterScope();
    
    // 参数处理
    const params = ['_value', '_k', '_h'];
    
    // 函数体转换
    const body = this.visitNode(node.body) as CPSStatement;
    
    this.symbolTable.exitScope();
    this.currentFunction = oldFunction;
    
    return {
      type: 'CPSFunction',
      params,
      body: Array.isArray(body) ? body : [body],
      isAsync: node.async,
      isGenerator: node.generator,
      location: node.location
    };
  }

  private visitArrowFunctionExpression(node: AST.ArrowFunctionExpression): CPSFunction {
    // 类似于 FunctionExpression 的处理
    return this.visitFunctionExpression({
      ...node,
      type: 'FunctionExpression',
      id: undefined,
      body: node.body.type === 'BlockStatement' ? node.body : {
        type: 'BlockStatement',
        body: [{
          type: 'ReturnStatement',
          argument: node.body as Expression,
          location: node.location
        }],
        location: node.location
      } as AST.BlockStatement,
      generator: false
    } as AST.FunctionExpression);
  }

  private visitYieldExpression(node: AST.YieldExpression): CPSYield {
    const value = node.argument ? this.visitNode(node.argument) as CPSExpression : undefined;
    
    return {
      type: 'CPSYield',
      value,
      delegate: node.delegate,
      location: node.location
    };
  }

  private visitAwaitExpression(node: AST.AwaitExpression): CPSAwait {
    const value = this.visitNode(node.argument) as CPSExpression;
    
    return {
      type: 'CPSAwait',
      value,
      location: node.location
    };
  }

  private visitBlockStatement(node: AST.BlockStatement): CPSStatement {
    const body = node.body.map(stmt => this.visitNode(stmt) as CPSStatement);
    
    return {
      type: 'CPSBlock',
      body,
      location: node.location
    } as CPSStatement;
  }

  private visitExpressionStatement(node: AST.ExpressionStatement): CPSStatement {
    const expression = this.visitNode(node.expression) as CPSExpression;
    
    return {
      type: 'CPSExpressionStatement',
      expression,
      location: node.location
    } as CPSStatement;
  }

  private visitVariableDeclaration(node: AST.VariableDeclaration): CPSStatement {
    const declarations = node.declarations.map(decl => {
      const init = decl.init ? this.visitNode(decl.init) as CPSExpression : {
        type: 'CPSLiteral',
        value: undefined,
        location: node.location
      };
      
      if (decl.id.type === 'Pattern' && decl.id.kind === 'Identifier') {
        const pattern = decl.id as AST.IdentifierPattern;
        const compiledName = this.symbolTable.generateCompiledName(pattern.name);
        
        return {
          type: 'CPSAssignment',
          target: compiledName,
          value: init,
          location: node.location
        };
      }
      
      throw new Error('Complex variable declarations not yet supported');
    });
    
    return {
      type: 'CPSVariableDeclaration',
      declarations,
      kind: node.kind,
      location: node.location
    } as CPSStatement;
  }

  private visitReturnStatement(node: AST.ReturnStatement): CPSReturn {
    const value = node.argument ? 
      this.visitNode(node.argument) as CPSExpression : 
      { type: 'CPSLiteral', value: undefined, location: node.location };
    
    return {
      type: 'CPSReturn',
      value,
      location: node.location
    };
  }

  private visitIfStatement(node: AST.IfStatement): CPSIf {
    const test = this.visitNode(node.test) as CPSExpression;
    const consequent = [this.visitNode(node.consequent) as CPSStatement];
    const alternate = node.alternate ? [this.visitNode(node.alternate) as CPSStatement] : undefined;
    
    return {
      type: 'CPSIf',
      test,
      consequent,
      alternate,
      location: node.location
    };
  }

  private visitLoopStatement(node: AST.LoopStatement): CPSLoop {
    const label = node.label || this.generateLabel();
    this.loopStack.push(label);
    
    const body = [this.visitNode(node.body) as CPSStatement];
    
    this.loopStack.pop();
    
    return {
      type: 'CPSLoop',
      label,
      body,
      location: node.location
    };
  }

  private visitBreakStatement(node: AST.BreakStatement): CPSBreak {
    return {
      type: 'CPSBreak',
      label: node.label || this.loopStack[this.loopStack.length - 1],
      location: node.location
    };
  }

  private visitContinueStatement(node: AST.ContinueStatement): CPSContinue {
    return {
      type: 'CPSContinue',
      label: node.label || this.loopStack[this.loopStack.length - 1],
      location: node.location
    };
  }

  private visitRaiseStatement(node: AST.RaiseStatement): CPSRaise {
    const effect = this.visitNode(node.argument) as CPSExpression;
    
    return {
      type: 'CPSRaise',
      effect,
      location: node.location
    };
  }

  private visitTryStatement(node: AST.TryStatement): CPSStatement {
    // 简化实现
    const body = [this.visitNode(node.block) as CPSStatement];
    const handler = node.handler ? this.visitNode(node.handler) as CPSHandler : undefined;
    
    return {
      type: 'CPSTry',
      body,
      handler,
      location: node.location
    } as CPSStatement;
  }

  private visitHandlerStatement(node: AST.HandlerStatement): CPSHandler {
    const body: CPSStatement[] = [];
    const cases = node.cases.map(c => ({
      pattern: { type: 'CPSLiteral', value: 'pattern', location: node.location } as CPSExpression,
      action: c.action.map(stmt => this.visitNode(stmt) as CPSStatement),
      resume: false
    }));
    
    return {
      type: 'CPSHandler',
      body,
      cases,
      location: node.location
    };
  }

  // 占位符实现
  private visitMemberExpression(node: AST.MemberExpression): CPSExpression {
    return { type: 'CPSLiteral', value: null, location: node.location };
  }
  
  private visitArrayExpression(node: AST.ArrayExpression): CPSExpression {
    return { type: 'CPSLiteral', value: [], location: node.location };
  }
  
  private visitObjectExpression(node: AST.ObjectExpression): CPSExpression {
    return { type: 'CPSLiteral', value: {}, location: node.location };
  }
  
  private visitMatchExpression(node: AST.MatchExpression): CPSExpression {
    return { type: 'CPSLiteral', value: null, location: node.location };
  }
  
  private visitFunctionDeclaration(node: AST.FunctionDeclaration): CPSStatement {
    return { type: 'CPSLiteral', value: null, location: node.location } as any;
  }
  
  private visitClassDeclaration(node: AST.ClassDeclaration): CPSStatement {
    return { type: 'CPSLiteral', value: null, location: node.location } as any;
  }
  
  private visitUnionDeclaration(node: AST.UnionDeclaration): CPSStatement {
    return { type: 'CPSLiteral', value: null, location: node.location } as any;
  }
  
  private visitTraitDeclaration(node: AST.TraitDeclaration): CPSStatement {
    return { type: 'CPSLiteral', value: null, location: node.location } as any;
  }
  
  private visitImplDeclaration(node: AST.ImplDeclaration): CPSStatement {
    return { type: 'CPSLiteral', value: null, location: node.location } as any;
  }
  
  private visitMatchStatement(node: AST.MatchStatement): CPSStatement {
    return { type: 'CPSLiteral', value: null, location: node.location } as any;
  }

  // 辅助方法
  private generateTempVar(): string {
    return `_temp${this.nextVarId++}`;
  }

  private generateLabel(): string {
    return `_label${this.nextLabelId++}`;
  }
}