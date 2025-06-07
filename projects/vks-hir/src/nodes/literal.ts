import {ASTNode} from './index';


export type LiteralNode =
    | NumberLiteral
    | StringLiteral
    | BooleanLiteral
    | NullLiteral;

export interface NullLiteral extends ASTNode {
    type: 'NullLiteral';
}

export interface BooleanLiteral extends ASTNode {
    type: 'BooleanLiteral';
    value: boolean;
}

export interface IdentifierLiteral extends ASTNode {
    type: 'IdentifierLiteral';
    value: string;
}

export interface NumberLiteral extends ASTNode {
    type: 'NumberLiteral';
    value: number;
    raw: string;
}

export interface StringLiteral extends ASTNode {
    type: 'StringLiteral';
    handler: string;
    text: string;
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
        text: value,
        handler: raw,
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
        location
    };
}
