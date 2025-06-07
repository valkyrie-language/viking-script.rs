import { Type, Scope, VariableInfo, FunctionInfo } from './ast';

export class SymbolTable {
  private currentScope: Scope;
  private globalScope: Scope;
  private scopeStack: Scope[] = [];

  constructor() {
    this.globalScope = this.createScope();
    this.currentScope = this.globalScope;
    this.initBuiltins();
  }

  private createScope(parent?: Scope): Scope {
    return {
      parent,
      variables: new Map(),
      functions: new Map(),
      types: new Map(),
      level: parent ? parent.level + 1 : 0
    };
  }

  private initBuiltins(): void {
    // 内置类型
    const builtinTypes = [
      'string', 'number', 'boolean', 'null', 'undefined', 'any', 'void'
    ];
    
    builtinTypes.forEach(typeName => {
      this.globalScope.types.set(typeName, {
        kind: 'Primitive',
        name: typeName
      });
    });

    // 内置函数
    this.globalScope.functions.set('print', {
      name: 'print',
      parameters: [{ kind: 'Primitive', name: 'any' }],
      returnType: { kind: 'Primitive', name: 'void' },
      isAsync: false,
      isGenerator: false,
      namespace: []
    });

    this.globalScope.functions.set('sleep', {
      name: 'sleep',
      parameters: [{ kind: 'Primitive', name: 'number' }],
      returnType: { kind: 'Promise', name: 'Promise', parameters: [{ kind: 'Primitive', name: 'void' }] },
      isAsync: true,
      isGenerator: false,
      namespace: []
    });
  }

  enterScope(): Scope {
    const newScope = this.createScope(this.currentScope);
    this.scopeStack.push(this.currentScope);
    this.currentScope = newScope;
    return newScope;
  }

  exitScope(): Scope | undefined {
    const previousScope = this.scopeStack.pop();
    if (previousScope) {
      this.currentScope = previousScope;
    }
    return previousScope;
  }

  getCurrentScope(): Scope {
    return this.currentScope;
  }

  getGlobalScope(): Scope {
    return this.globalScope;
  }

  declareVariable(name: string, type: Type, mutable: boolean = false, namespace: string[] = []): boolean {
    const fullName = this.getFullName(name, namespace);
    
    if (this.currentScope.variables.has(fullName)) {
      return false; // 变量已存在
    }

    const variableInfo: VariableInfo = {
      name,
      type,
      mutable,
      namespace
    };

    this.currentScope.variables.set(fullName, variableInfo);
    return true;
  }

  declareFunction(name: string, parameters: Type[], returnType: Type, 
                 isAsync: boolean = false, isGenerator: boolean = false, 
                 namespace: string[] = []): boolean {
    const fullName = this.getFullName(name, namespace);
    
    if (this.currentScope.functions.has(fullName)) {
      return false; // 函数已存在
    }

    const functionInfo: FunctionInfo = {
      name,
      parameters,
      returnType,
      isAsync,
      isGenerator,
      namespace
    };

    this.currentScope.functions.set(fullName, functionInfo);
    return true;
  }

  declareType(name: string, type: Type, namespace: string[] = []): boolean {
    const fullName = this.getFullName(name, namespace);
    
    if (this.currentScope.types.has(fullName)) {
      return false; // 类型已存在
    }

    this.currentScope.types.set(fullName, type);
    return true;
  }

  lookupVariable(name: string, namespace: string[] = []): VariableInfo | undefined {
    const fullName = this.getFullName(name, namespace);
    return this.lookup(fullName, 'variables');
  }

  lookupFunction(name: string, namespace: string[] = []): FunctionInfo | undefined {
    const fullName = this.getFullName(name, namespace);
    return this.lookup(fullName, 'functions');
  }

  lookupType(name: string, namespace: string[] = []): Type | undefined {
    const fullName = this.getFullName(name, namespace);
    return this.lookup(fullName, 'types');
  }

  private lookup<T>(name: string, category: 'variables' | 'functions' | 'types'): T | undefined {
    let scope: Scope | undefined = this.currentScope;
    
    while (scope) {
      const map = scope[category] as Map<string, T>;
      if (map.has(name)) {
        return map.get(name);
      }
      scope = scope.parent;
    }
    
    return undefined;
  }

  private getFullName(name: string, namespace: string[]): string {
    if (namespace.length === 0) {
      return name;
    }
    return namespace.join('::') + '::' + name;
  }

  // 生成唯一的编译后变量名
  generateCompiledName(name: string, namespace: string[] = []): string {
    const fullName = this.getFullName(name, namespace);
    // 使用简单的哈希算法生成唯一名称
    const hash = this.simpleHash(fullName);
    return `_vks_${name}_${hash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(36);
  }

  // 检查变量是否可变
  isVariableMutable(name: string, namespace: string[] = []): boolean {
    const variable = this.lookupVariable(name, namespace);
    return variable ? variable.mutable : false;
  }

  // 获取所有可见的变量
  getVisibleVariables(): Map<string, VariableInfo> {
    const result = new Map<string, VariableInfo>();
    let scope: Scope | undefined = this.currentScope;
    
    while (scope) {
      for (const [name, info] of scope.variables) {
        if (!result.has(name)) {
          result.set(name, info);
        }
      }
      scope = scope.parent;
    }
    
    return result;
  }
}