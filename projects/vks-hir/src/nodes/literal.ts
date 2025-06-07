import {ASTNode} from './index';

export interface LiteralNode extends ASTNode {
    type: 'Literal';
    kind: string;
}

export type Literal =
    | NumberLiteral
    | StringLiteral
    | BooleanLiteral
    | NullLiteral;

export interface NullLiteral extends ASTNode {
    type: 'NullLiteral';
    value: null;
}

export interface BooleanLiteral extends ASTNode {
    type: 'BooleanLiteral';
    value: boolean;
}

export interface NumberLiteral extends ASTNode {
    type: 'NumberLiteral';
    value: number;
    raw: string;
}

export interface StringLiteral extends ASTNode {
    type: 'StringLiteral';
    value: string;
    raw: string;
}


// 工厂函数
export function createNumberLiteral(value: number, raw: string, location: Location): NumberLiteral {
    return {
        type: 'NumberLiteral',
        value,
        raw,
        location
    };
}

export function createStringLiteral(value: string, raw: string, location: Location): StringLiteral {
    return {
        type: 'StringLiteral',
        value,
        raw,
        location
    };
}

export function createBooleanLiteral(value: boolean, location: Location): BooleanLiteral {
    return {
        type: 'BooleanLiteral',
        value,
        location
    };
}

export function createNullLiteral(location: Location): NullLiteral {
    return {
        type: 'NullLiteral',
        value: null,
        location
    };
}
