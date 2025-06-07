import {ASTNode} from './index';
import {Statement} from './statement';
import {LiteralNode} from './literal';
import {Pattern} from './pattern';
import {TypeAnnotation} from './type';

export interface NamePathNode extends ASTNode {
    type: 'NamePathNode';
    name: string;
    namespace?: string[];
}

export interface BinaryExpression extends ASTNode {
    type: 'BinaryExpression';
    operator: string;
    left: Expression;
    right: Expression;
}

export interface UnaryExpression extends ASTNode {
    type: 'UnaryExpression';
    operator: string;
    argument: Expression;
    prefix: boolean;
}

export interface AssignmentExpression extends ASTNode {
    type: 'AssignmentExpression';
    operator: string;
    left: Expression;
    right: Expression;
}

export interface CallExpression extends ASTNode {
    type: 'CallExpression';
    callee: Expression;
    arguments: Expression[];
    typeArguments?: TypeAnnotation[];
}

export interface MemberExpression extends ASTNode {
    type: 'MemberExpression';
    object: Expression;
    property: Expression;
    computed: boolean;
}

export interface ConditionalExpression extends ASTNode {
    type: 'ConditionalExpression';
    test: Expression;
    consequent: Expression;
    alternate: Expression;
}

export interface ArrayExpression extends ASTNode {
    type: 'ArrayExpression';
    elements: (Expression | null)[];
}

export interface ObjectProperty {
    key: Expression;
    value: Expression;
    computed: boolean;
    shorthand: boolean;
}

export interface ObjectExpression extends ASTNode {
    type: 'ObjectExpression';
    properties: ObjectProperty[];
}

export interface FunctionExpression extends ASTNode {
    type: 'FunctionExpression';
    id?: NamePathNode;
    params: Pattern[];
    body: Statement;
    async: boolean;
    generator: boolean;
    returnType?: TypeAnnotation;
}

export interface ArrowFunctionExpression extends ASTNode {
    type: 'ArrowFunctionExpression';
    params: Pattern[];
    body: Expression | Statement;
    async: boolean;
    returnType?: TypeAnnotation;
}

export interface YieldExpression extends ASTNode {
    type: 'YieldExpression';
    argument?: Expression;
    delegate: boolean; // yield from
}

export interface AwaitExpression extends ASTNode {
    type: 'AwaitExpression';
    argument: Expression;
}

export interface MatchCase {
    pattern: Pattern;
    guard?: Expression;
    consequent: Statement[];
    fallthrough?: boolean;
    fallthroughForced?: boolean; // fallthrough!
}

export interface MatchExpression extends ASTNode {
    type: 'MatchExpression';
    discriminant: Expression;
    cases: MatchCase[];
}

export type Expression =
    | NamePathNode
    | LiteralNode
    | BinaryExpression
    | UnaryExpression
    | AssignmentExpression
    | CallExpression
    | MemberExpression
    | ConditionalExpression
    | ArrayExpression
    | ObjectExpression
    | FunctionExpression
    | ArrowFunctionExpression
    | YieldExpression
    | AwaitExpression
    | MatchExpression;

// 工厂函数
export function createNamepath(name: string, location: Location, namespace?: string[]): NamePathNode {
    return {
        type: 'NamePathNode',
        name,
        namespace,
        location
    };
}

export function createBinaryExpression(
    operator: string,
    left: Expression,
    right: Expression,
    location: Location
): BinaryExpression {
    return {
        type: 'BinaryExpression',
        operator,
        left,
        right,
        location
    };
}

export function createCallExpression(
    callee: Expression,
    args: Expression[],
    location: Location,
    typeArguments?: TypeAnnotation[]
): CallExpression {
    return {
        type: 'CallExpression',
        callee,
        arguments: args,
        typeArguments,
        location
    };
}