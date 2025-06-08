// CPS 变换后的节点类型
export interface CPSNode {
    type: CPSType;
}

export type CPSType =
    | 'CPSFunction'
    | 'CPSCall'
    | 'CPSLiteral'
    | 'CPSVariable'
    | 'CPSLambda'
    | 'CPSConditional'
    | 'CPSSequence'
    | 'CPSEffect';

export interface CPSFunction {
    type: 'CPSFunction';
    name?: string;
    params: string[];
    body: CPSExpression;
    location?: any;
}

export interface CPSExpression {
    type: string;
}

export interface CPSCall {
    type: 'CPSCall';
    function: string;
    args: CPSExpression[];
    continuation: CPSExpression;
}

export interface CPSLiteral {
    type: 'CPSLiteral';
    valueType: 'number' | 'string' | 'boolean' | 'null' | 'undefined';
    value: any;
}

export interface CPSVariable {
    type: 'CPSVariable';
    name: string;
}

export interface CPSLambda {
    type: 'CPSLambda';
    params: string[];
    body: CPSExpression;
}

export interface CPSConditional {
    type: 'CPSConditional';
    condition: CPSExpression;
    thenBranch: CPSExpression;
    elseBranch: CPSExpression;
}

export interface CPSSequence {
    type: 'CPSSequence';
    expressions: CPSExpression[];
}

export interface CPSEffect {
    type: 'CPSEffect';
    name: string;
    args: CPSExpression[];
    continuation: CPSExpression;
}

export class CPSTransformer {

}