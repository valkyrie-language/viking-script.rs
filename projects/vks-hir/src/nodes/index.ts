// 导出所有 AST 节点类型
export * from './statement.ts';
export * from './expression.ts';
export * from './literal.ts';
export * from './pattern.ts';
export * from './type.ts';
import { Location } from "../helper.ts";

// AST 基础类型定义

export interface ASTNode {
    type: NodeType;
    location?: Location;
    meta?: {
        inferredType?: Type;
        scope?: Scope;
        compiledName?: string;
        cpsTransformed?: boolean;
    };
}

export type NodeType =
// Program
    | "Program"
    // Literals
    | "NumberLiteral"
    | "StringLiteral"
    | "BooleanLiteral"
    | "NullLiteral"
    | "UndefinedLiteral"
    // Identifiers
    | "IdentifierLiteral"
    | "NamePathNode"
    // Expressions
    | "BinaryExpression"
    | "UnaryExpression"
    | "AssignmentExpression"
    | "CallExpression"
    | "MemberExpression"
    | "ConditionalExpression"
    | "ArrayExpression"
    | "ObjectExpression"
    | "FunctionExpression"
    | "ArrowFunctionExpression"
    | "YieldExpression"
    | "AwaitExpression"
    | "MatchExpression"
    // Statements
    | "ExpressionStatement"
    | "BlockStatement"
    | "VariableDeclaration"
    | "FunctionDeclaration"
    | "ClassDeclaration"
    | "UnionDeclaration"
    | "TraitDeclaration"
    | "ImplDeclaration"
    | "IfStatement"
    | "MatchStatement"
    | "LoopStatement"
    | "BreakStatement"
    | "ContinueStatement"
    | "ReturnStatement"
    | "TryStatement"
    | "HandlerStatement"
    | "RaiseStatement"
    | "MacroDeclaration"
    | "TypeDeclaration"
    // Patterns
    | "Pattern"
    | "MatchCase"
    // Types
    | "TypeAnnotation"
    | "UnionType"
    | "IntersectionType"
    | "TupleType"
    | "FunctionType"
    | "GenericType";

export interface Type {
    kind: string;
    name?: string;
    parameters?: Type[];
    properties?: { [key: string]: Type };
    returnType?: Type;
    head?: string;
}

export interface Scope {
    parent?: Scope;
    variables: Map<string, VariableInfo>;
    functions: Map<string, FunctionInfo>;
    types: Map<string, Type>;
    level: number;
}

export interface VariableInfo {
    name: string;
    type: Type;
    mutable: boolean;
    namespace: string[];
}

export interface FunctionInfo {
    name: string;
    parameters: Type[];
    returnType: Type;
    isAsync: boolean;
    isGenerator: boolean;
    namespace: string[];
}

