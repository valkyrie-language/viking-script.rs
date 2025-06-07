import {ASTNode} from './index';
import {Expression} from './expression';
import {TypeAnnotation} from './type';

export interface PatternNode extends ASTNode {
    type: 'Pattern';
}

export interface ObjectPatternProperty {
    key: Expression;
    value: Pattern;
    computed: boolean;
    shorthand: boolean;
}

export interface IdentifierPattern extends ASTNode {
    type: 'Pattern';
    kind: 'Identifier';
    name: string;
    typeAnnotation?: TypeAnnotation;
}

export interface LiteralPattern extends ASTNode {
    type: 'Pattern';
    kind: 'Literal';
    value: any;
}

export interface ArrayPattern extends ASTNode {
    type: 'Pattern';
    kind: 'Array';
    elements: (Pattern | null)[];
}


export interface ObjectPattern extends ASTNode {
    type: 'Pattern';
    kind: 'Object';
    properties: ObjectPatternProperty[];
}

export interface RestPattern extends ASTNode {
    type: 'Pattern';
    kind: 'Rest';
    argument: Pattern;
}

export interface WildcardPattern extends ASTNode {
    type: 'Pattern';
    kind: 'Wildcard'; // _ 通配符
}

export interface TypePattern extends ASTNode {
    type: 'Pattern';
    kind: 'Type';
    typeAnnotation: TypeAnnotation;
    condition?: Expression; // type Student if age > 10
}

export interface ConditionPattern extends ASTNode {
    type: 'Pattern';
    kind: 'Condition';
    condition: Expression;
}

export interface DestructurePattern extends ASTNode {
    type: 'Pattern';
    kind: 'Destructure';
    typeName: string;
    fields: { name: string; pattern: Pattern }[];
}

export interface GuardPattern extends ASTNode {
    type: 'Pattern';
    kind: 'Guard';
    pattern: Pattern;
    guard: Expression;
}

export interface RangePattern extends ASTNode {
    type: 'Pattern';
    kind: 'Range';
    start: Expression;
    end: Expression;
    inclusive: boolean;
}

export type Pattern =
    | IdentifierPattern
    | LiteralPattern
    | ArrayPattern
    | ObjectPattern
    | RestPattern
    | WildcardPattern
    | TypePattern
    | ConditionPattern
    | DestructurePattern
    | GuardPattern
    | RangePattern;

// 工厂函数
export function createIdentifierPattern(
    name: string,
    location: Location,
    typeAnnotation?: TypeAnnotation
): IdentifierPattern {
    return {
        type: 'Pattern',
        kind: 'Identifier',
        name,
        typeAnnotation,
        location
    };
}

export function createLiteralPattern(value: any, location: Location): LiteralPattern {
    return {
        type: 'Pattern',
        kind: 'Literal',
        value,
        location
    };
}

export function createWildcardPattern(location: Location): WildcardPattern {
    return {
        type: 'Pattern',
        kind: 'Wildcard',
        location
    };
}

export function createTypePattern(
    typeAnnotation: TypeAnnotation,
    location: Location,
    condition?: Expression
): TypePattern {
    return {
        type: 'Pattern',
        kind: 'Type',
        typeAnnotation,
        condition,
        location
    };
}

export function createDestructurePattern(
    typeName: string,
    fields: { name: string; pattern: Pattern }[],
    location: Location
): DestructurePattern {
    return {
        type: 'Pattern',
        kind: 'Destructure',
        typeName,
        fields,
        location
    };
}