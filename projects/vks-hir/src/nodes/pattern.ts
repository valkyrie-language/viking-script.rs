import {ASTNode} from './index.ts';
import {Expression} from './expression.ts';
import {TypeAnnotation} from './type.ts';

export interface PatternNode extends ASTNode {
    type: 'Pattern';
}

export interface ObjectPatternProperty {
    key: Expression;
    value: Pattern;
    computed: boolean;
    shorthand: boolean;
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

export interface IdentifierPattern extends PatternNode {
    kind: 'Identifier';
    name: string;
    typeAnnotation?: TypeAnnotation;
}

export interface LiteralPattern extends PatternNode {
    kind: 'Literal';
    value: any;
}

export interface ArrayPattern extends PatternNode {
    kind: 'Array';
    elements: (Pattern | null)[];
}


export interface ObjectPattern extends PatternNode {
    kind: 'Object';
    properties: ObjectPatternProperty[];
}

export interface RestPattern extends PatternNode {
    kind: 'Rest';
    argument: Pattern;
}

export interface WildcardPattern extends PatternNode {
    kind: 'Wildcard';
}

export interface TypePattern extends PatternNode {
    kind: 'Type';
    typeAnnotation: TypeAnnotation;
    condition?: Expression;
}

export interface ConditionPattern extends PatternNode {
    kind: 'Condition';
    condition: Expression;
}

export interface DestructurePattern extends PatternNode {
    kind: 'Destructure';
    typeName: string;
    fields: { name: string; pattern: Pattern }[];
}

export interface GuardPattern extends PatternNode {
    kind: 'Guard';
    pattern: Pattern;
    guard: Expression;
}

export interface RangePattern extends PatternNode {
    kind: 'Range';
    start: Expression;
    end: Expression;
    inclusive: boolean;
}


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