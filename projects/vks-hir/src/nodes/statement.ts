import {ASTNode} from './index';
import {Expression, MatchCase} from './expression';
import {Pattern} from './pattern';
import {TypeAnnotation} from './type';

export interface Program extends ASTNode {
    type: 'Program';
    body: Statement[];
}

export interface ExpressionStatement extends ASTNode {
    type: 'ExpressionStatement';
    expression: Expression;
}

export interface BlockStatement extends ASTNode {
    type: 'BlockStatement';
    body: Statement[];
}

export interface VariableDeclarator {
    id: Pattern;
    init?: Expression;
    typeAnnotation?: TypeAnnotation;
}

export interface VariableDeclaration extends ASTNode {
    type: 'VariableDeclaration';
    declarations: VariableDeclarator[];
    kind: 'let' | 'const' | 'mut'; // mut 表示可变变量
}

export interface FunctionDeclaration extends ASTNode {
    type: 'FunctionDeclaration';
    id: Expression; // Identifier
    params: Pattern[];
    body: BlockStatement;
    async: boolean;
    generator: boolean;
    returnType?: TypeAnnotation;
}

export interface ClassProperty {
    key: Expression;
    value?: Expression;
    typeAnnotation?: TypeAnnotation;
    static: boolean;
    readonly: boolean;
}

export interface ClassMethod {
    key: Expression;
    value: FunctionDeclaration;
    kind: 'constructor' | 'method' | 'get' | 'set';
    static: boolean;
}

export interface ClassDeclaration extends ASTNode {
    type: 'ClassDeclaration';
    id: Expression; // Identifier
    superClass?: Expression;
    body: (ClassProperty | ClassMethod)[];
    typeParameters?: TypeAnnotation[];
}

export interface UnionVariant {
    name: string;
    fields: { name: string; type: TypeAnnotation }[];
}

export interface UnionDeclaration extends ASTNode {
    type: 'UnionDeclaration';
    id: Expression; // Identifier
    variants: UnionVariant[];
    typeParameters?: TypeAnnotation[];
}

export interface TraitMethod {
    name: string;
    params: Pattern[];
    returnType?: TypeAnnotation;
    body?: BlockStatement; // 默认实现
}

export interface TraitDeclaration extends ASTNode {
    type: 'TraitDeclaration';
    id: Expression; // Identifier
    methods: TraitMethod[];
    typeParameters?: TypeAnnotation[];
}

export interface ImplDeclaration extends ASTNode {
    type: 'ImplDeclaration';
    trait: Expression; // Identifier
    target: TypeAnnotation;
    methods: ClassMethod[];
}

export interface IfStatement extends ASTNode {
    type: 'IfStatement';
    test: Expression;
    consequent: Statement;
    alternate?: Statement;
}

export interface MatchStatement extends ASTNode {
    type: 'MatchStatement';
    discriminant: Expression;
    cases: MatchCase[];
}

export interface LoopStatement extends ASTNode {
    type: 'LoopStatement';
    label?: string;
    body: Statement;
}

export interface BreakStatement extends ASTNode {
    type: 'BreakStatement';
    label?: string;
}

export interface ContinueStatement extends ASTNode {
    type: 'ContinueStatement';
    label?: string;
}

export interface ReturnStatement extends ASTNode {
    type: 'ReturnStatement';
    argument?: Expression;
}

export interface HandlerCase {
    pattern: Pattern;
    action: Statement[];
    withHandler?: Expression; // with 语句引用的处理器
}

export interface TryStatement extends ASTNode {
    type: 'TryStatement';
    block: BlockStatement;
    handler?: HandlerStatement;
}

export interface HandlerStatement extends ASTNode {
    type: 'HandlerStatement';
    label?: string;
    cases: HandlerCase[];
    elseCase?: Statement[];
}

export interface RaiseStatement extends ASTNode {
    type: 'RaiseStatement';
    argument: Expression;
}

export interface MacroDeclaration extends ASTNode {
    type: 'MacroDeclaration';
    id: Expression; // Identifier
    params: Pattern[];
    body: BlockStatement;
    returnType?: TypeAnnotation;
}

export interface TypeDeclaration extends ASTNode {
    type: 'TypeDeclaration';
    id: Expression; // Identifier
    params: Pattern[];
    body: BlockStatement;
    returnType: TypeAnnotation;
}

export type Statement =
    | Program
    | ExpressionStatement
    | BlockStatement
    | VariableDeclaration
    | FunctionDeclaration
    | ClassDeclaration
    | UnionDeclaration
    | TraitDeclaration
    | ImplDeclaration
    | IfStatement
    | MatchStatement
    | LoopStatement
    | BreakStatement
    | ContinueStatement
    | ReturnStatement
    | TryStatement
    | HandlerStatement
    | RaiseStatement
    | MacroDeclaration
    | TypeDeclaration;

// 工厂函数
export function createProgram(body: Statement[], location: Location): Program {
    return {
        type: 'Program',
        body,
        location
    };
}

export function createBlockStatement(body: Statement[], location: Location): BlockStatement {
    return {
        type: 'BlockStatement',
        body,
        location
    };
}

export function createVariableDeclaration(
    declarations: VariableDeclarator[],
    kind: 'let' | 'const' | 'mut',
    location: Location
): VariableDeclaration {
    return {
        type: 'VariableDeclaration',
        declarations,
        kind,
        location
    };
}