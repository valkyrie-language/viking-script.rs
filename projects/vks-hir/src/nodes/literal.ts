import {ASTNode} from './index.ts';


export type LiteralNode =
    | NullLiteral
    | BooleanLiteral
    | IdentifierLiteral
    | NumberLiteral
    | StringLiteral
    ;

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
    handler?: IdentifierLiteral;
    text: string;
}
