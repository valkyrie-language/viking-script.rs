import { ASTNode, Type, Statement, Expression, Pattern } from './ast';
import { SymbolTable } from './symbol-table';
import * as AST from './ast';

export interface TypeCheckError {
  message: string;
  location: AST.Location;
  code: string;
}

export class TypeChecker {
  private symbolTable: SymbolTable;
  private errors: TypeCheckError[] = [];
  private currentReturnType?: Type;
  private inGenerator: boolean = false;
  private inAsync: boolean = false;

  constructor(symbolTable: SymbolTable) {
    this.symbolTable = symbolTable;
  }

  check(node: ASTNode): Type {
    this.errors = [];
    return this.visitNode(node);
  }

  getErrors(): TypeCheckError[] {
    return this.errors;
  }

  private addError(message: string, location: AST.Location, code: string = 'TYPE_ERROR'): void {
    this.errors.push({ message, location, code });
  }

  private visitNode(node: ASTNode): Type {
    switch (node.type) {
      case 'Program':
        return this.visitProgram(node as AST.Program);
      case 'NumberLiteral':
        return this.visitNumberLiteral(node as AST.NumberLiteral);
      case 'StringLiteral':
        return this.visitStringLiteral(node as AST.StringLiteral);
      case 'BooleanLiteral':
        return this.visitBooleanLiteral(node as AST.BooleanLiteral);
      case 'NullLiteral':
        return this.visitNullLiteral(node as AST.NullLiteral);
      case 'UndefinedLiteral':
        return this.visitUndefinedLiteral(node as AST.UndefinedLiteral);
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
      case 'AwaitExpression':
        return this.visitAwaitExpression(node as AST.AwaitExpression);
      case 'YieldExpression':
        return this.visitYieldExpression(node as AST.YieldExpression);
      case 'MatchExpression':
        return this.visitMatchExpression(node as AST.MatchExpression);
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
      case 'BlockStatement':
        return this.visitBlockStatement(node as AST.BlockStatement);
      case 'ExpressionStatement':
        return this.visitExpressionStatement(node as AST.ExpressionStatement);
      case 'ReturnStatement':
        return this.visitReturnStatement(node as AST.ReturnStatement);
      case 'IfStatement':
        return this.visitIfStatement(node as AST.IfStatement);
      case 'MatchStatement':
        return this.visitMatchStatement(node as AST.MatchStatement);
      case 'LoopStatement':
        return this.visitLoopStatement(node as AST.LoopStatement);
      default:
        this.addError(`Unsupported node type: ${node.type}`, node.location);
        return { kind: 'Primitive', name: 'any' };
    }
  }

  private visitProgram(node: AST.Program): Type {
    let lastType: Type = { kind: 'Primitive', name: 'void' };
    
    for (const statement of node.body) {
      lastType = this.visitNode(statement);
    }
    
    return lastType;
  }

  private visitNumberLiteral(node: AST.NumberLiteral): Type {
    const type = { kind: 'Primitive', name: 'number' as const };
    this.setInferredType(node, type);
    return type;
  }

  private visitStringLiteral(node: AST.StringLiteral): Type {
    const type = { kind: 'Primitive', name: 'string' as const };
    this.setInferredType(node, type);
    return type;
  }

  private visitBooleanLiteral(node: AST.BooleanLiteral): Type {
    const type = { kind: 'Primitive', name: 'boolean' as const };
    this.setInferredType(node, type);
    return type;
  }

  private visitNullLiteral(node: AST.NullLiteral): Type {
    const type = { kind: 'Primitive', name: 'null' as const };
    this.setInferredType(node, type);
    return type;
  }

  private visitUndefinedLiteral(node: AST.UndefinedLiteral): Type {
    const type = { kind: 'Primitive', name: 'undefined' as const };
    this.setInferredType(node, type);
    return type;
  }

  private visitIdentifier(node: AST.Identifier): Type {
    const variable = this.symbolTable.lookupVariable(node.name, node.namespace);
    if (variable) {
      this.setInferredType(node, variable.type);
      return variable.type;
    }

    const func = this.symbolTable.lookupFunction(node.name, node.namespace);
    if (func) {
      const type = {
        kind: 'Function',
        parameters: func.parameters,
        returnType: func.returnType,
        async: func.isAsync,
        generator: func.isGenerator
      };
      this.setInferredType(node, type);
      return type;
    }

    this.addError(`Undefined identifier: ${node.name}`, node.location, 'UNDEFINED_IDENTIFIER');
    const anyType = { kind: 'Primitive', name: 'any' as const };
    this.setInferredType(node, anyType);
    return anyType;
  }

  private visitBinaryExpression(node: AST.BinaryExpression): Type {
    const leftType = this.visitNode(node.left);
    const rightType = this.visitNode(node.right);

    // 类型推断规则
    switch (node.operator) {
      case '+':
        if (this.isStringType(leftType) || this.isStringType(rightType)) {
          const type = { kind: 'Primitive', name: 'string' as const };
          this.setInferredType(node, type);
          return type;
        }
        if (this.isNumberType(leftType) && this.isNumberType(rightType)) {
          const type = { kind: 'Primitive', name: 'number' as const };
          this.setInferredType(node, type);
          return type;
        }
        break;
      case '-':
      case '*':
      case '/':
      case '%':
        if (this.isNumberType(leftType) && this.isNumberType(rightType)) {
          const type = { kind: 'Primitive', name: 'number' as const };
          this.setInferredType(node, type);
          return type;
        }
        break;
      case '==':
      case '!=':
      case '<':
      case '<=':
      case '>':
      case '>=':
        const type = { kind: 'Primitive', name: 'boolean' as const };
        this.setInferredType(node, type);
        return type;
      case '&&':
      case '||':
        // 逻辑运算符返回操作数类型的联合
        const unionType = { kind: 'Union', types: [leftType, rightType] };
        this.setInferredType(node, unionType);
        return unionType;
    }

    this.addError(
      `Invalid binary operation: ${leftType.kind} ${node.operator} ${rightType.kind}`,
      node.location,
      'INVALID_BINARY_OP'
    );
    const anyType = { kind: 'Primitive', name: 'any' as const };
    this.setInferredType(node, anyType);
    return anyType;
  }

  private visitAssignmentExpression(node: AST.AssignmentExpression): Type {
    const rightType = this.visitNode(node.right);
    
    if (node.left.type === 'Identifier') {
      const identifier = node.left as AST.Identifier;
      const variable = this.symbolTable.lookupVariable(identifier.name, identifier.namespace);
      
      if (!variable) {
        this.addError(`Undefined variable: ${identifier.name}`, node.location, 'UNDEFINED_VARIABLE');
        return rightType;
      }
      
      if (!variable.mutable) {
        this.addError(`Cannot assign to immutable variable: ${identifier.name}`, node.location, 'IMMUTABLE_ASSIGNMENT');
        return rightType;
      }
      
      if (!this.isAssignable(rightType, variable.type)) {
        this.addError(
          `Type '${this.typeToString(rightType)}' is not assignable to type '${this.typeToString(variable.type)}'`,
          node.location,
          'TYPE_MISMATCH'
        );
      }
    }
    
    this.setInferredType(node, rightType);
    return rightType;
  }

  private visitCallExpression(node: AST.CallExpression): Type {
    const calleeType = this.visitNode(node.callee);
    const argTypes = node.arguments.map(arg => this.visitNode(arg));

    if (calleeType.kind === 'Function') {
      const funcType = calleeType as any;
      
      // 检查参数数量
      if (argTypes.length !== funcType.parameters.length) {
        this.addError(
          `Expected ${funcType.parameters.length} arguments, got ${argTypes.length}`,
          node.location,
          'ARGUMENT_COUNT_MISMATCH'
        );
      }
      
      // 检查参数类型
      for (let i = 0; i < Math.min(argTypes.length, funcType.parameters.length); i++) {
        if (!this.isAssignable(argTypes[i], funcType.parameters[i])) {
          this.addError(
            `Argument ${i + 1}: type '${this.typeToString(argTypes[i])}' is not assignable to parameter type '${this.typeToString(funcType.parameters[i])}'`,
            node.location,
            'ARGUMENT_TYPE_MISMATCH'
          );
        }
      }
      
      this.setInferredType(node, funcType.returnType);
      return funcType.returnType;
    }

    this.addError(`Expression is not callable`, node.location, 'NOT_CALLABLE');
    const anyType = { kind: 'Primitive', name: 'any' as const };
    this.setInferredType(node, anyType);
    return anyType;
  }

  private visitVariableDeclaration(node: AST.VariableDeclaration): Type {
    for (const declarator of node.declarations) {
      const initType = declarator.init ? this.visitNode(declarator.init) : { kind: 'Primitive', name: 'undefined' as const };
      const declaredType = declarator.typeAnnotation ? this.resolveTypeAnnotation(declarator.typeAnnotation) : initType;
      
      if (declarator.init && !this.isAssignable(initType, declaredType)) {
        this.addError(
          `Type '${this.typeToString(initType)}' is not assignable to type '${this.typeToString(declaredType)}'`,
          node.location,
          'TYPE_MISMATCH'
        );
      }
      
      if (declarator.id.type === 'Pattern' && declarator.id.kind === 'Identifier') {
        const pattern = declarator.id as AST.IdentifierPattern;
        const isMutable = node.kind === 'mut';
        
        if (!this.symbolTable.declareVariable(pattern.name, declaredType, isMutable)) {
          this.addError(`Variable '${pattern.name}' is already declared`, node.location, 'DUPLICATE_DECLARATION');
        }
      }
    }
    
    return { kind: 'Primitive', name: 'void' };
  }

  // 辅助方法
  private setInferredType(node: ASTNode, type: Type): void {
    if (!node.meta) {
      node.meta = {};
    }
    node.meta.inferredType = type;
  }

  private isStringType(type: Type): boolean {
    return type.kind === 'Primitive' && type.name === 'string';
  }

  private isNumberType(type: Type): boolean {
    return type.kind === 'Primitive' && type.name === 'number';
  }

  private isAssignable(source: Type, target: Type): boolean {
    // 简化的类型兼容性检查
    if (source.kind === target.kind && source.name === target.name) {
      return true;
    }
    
    if (target.kind === 'Primitive' && target.name === 'any') {
      return true;
    }
    
    if (target.kind === 'Union') {
      const unionType = target as any;
      return unionType.types.some((t: Type) => this.isAssignable(source, t));
    }
    
    return false;
  }

  private typeToString(type: Type): string {
    switch (type.kind) {
      case 'Primitive':
        return type.name || 'unknown';
      case 'Union':
        const unionType = type as any;
        return unionType.types.map((t: Type) => this.typeToString(t)).join(' | ');
      case 'Function':
        return 'function';
      default:
        return type.kind;
    }
  }

  private resolveTypeAnnotation(annotation: AST.TypeAnnotation): Type {
    // 简化的类型解析
    switch (annotation.kind) {
      case 'Primitive':
        const primitiveType = annotation as AST.PrimitiveType;
        return { kind: 'Primitive', name: primitiveType.name };
      case 'Identifier':
        const identifierType = annotation as AST.IdentifierType;
        const resolvedType = this.symbolTable.lookupType(identifierType.name, identifierType.namespace);
        return resolvedType || { kind: 'Primitive', name: 'any' };
      default:
        return { kind: 'Primitive', name: 'any' };
    }
  }

  // 其他访问方法的简化实现
  private visitFunctionDeclaration(node: AST.FunctionDeclaration): Type {
    // TODO: 实现函数声明类型检查
    return { kind: 'Primitive', name: 'void' };
  }

  private visitBlockStatement(node: AST.BlockStatement): Type {
    this.symbolTable.enterScope();
    let lastType: Type = { kind: 'Primitive', name: 'void' };
    
    for (const statement of node.body) {
      lastType = this.visitNode(statement);
    }
    
    this.symbolTable.exitScope();
    return lastType;
  }

  private visitExpressionStatement(node: AST.ExpressionStatement): Type {
    return this.visitNode(node.expression);
  }

  // 其他方法的占位符实现
  private visitUnaryExpression(node: AST.UnaryExpression): Type { return { kind: 'Primitive', name: 'any' }; }
  private visitMemberExpression(node: AST.MemberExpression): Type { return { kind: 'Primitive', name: 'any' }; }
  private visitArrayExpression(node: AST.ArrayExpression): Type { return { kind: 'Primitive', name: 'any' }; }
  private visitObjectExpression(node: AST.ObjectExpression): Type { return { kind: 'Primitive', name: 'any' }; }
  private visitFunctionExpression(node: AST.FunctionExpression): Type { return { kind: 'Primitive', name: 'any' }; }
  private visitAwaitExpression(node: AST.AwaitExpression): Type { return { kind: 'Primitive', name: 'any' }; }
  private visitYieldExpression(node: AST.YieldExpression): Type { return { kind: 'Primitive', name: 'any' }; }
  private visitMatchExpression(node: AST.MatchExpression): Type { return { kind: 'Primitive', name: 'any' }; }
  private visitClassDeclaration(node: AST.ClassDeclaration): Type { return { kind: 'Primitive', name: 'void' }; }
  private visitUnionDeclaration(node: AST.UnionDeclaration): Type { return { kind: 'Primitive', name: 'void' }; }
  private visitTraitDeclaration(node: AST.TraitDeclaration): Type { return { kind: 'Primitive', name: 'void' }; }
  private visitImplDeclaration(node: AST.ImplDeclaration): Type { return { kind: 'Primitive', name: 'void' }; }
  private visitReturnStatement(node: AST.ReturnStatement): Type { return { kind: 'Primitive', name: 'void' }; }
  private visitIfStatement(node: AST.IfStatement): Type { return { kind: 'Primitive', name: 'void' }; }
  private visitMatchStatement(node: AST.MatchStatement): Type { return { kind: 'Primitive', name: 'void' }; }
  private visitLoopStatement(node: AST.LoopStatement): Type { return { kind: 'Primitive', name: 'void' }; }
}