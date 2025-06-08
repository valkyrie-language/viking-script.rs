import {ASTNode} from './index.ts';
import {Expression} from './expression.ts';

export interface TypeAnnotation extends ASTNode {
    type: 'TypeAnnotation';
    kind: string;
}

export interface PrimitiveType extends TypeAnnotation {
    kind: 'Primitive';
    name: 'string' | 'number' | 'boolean' | 'null' | 'undefined' | 'any' | 'void';
}

export interface IdentifierType extends TypeAnnotation {
    kind: 'Identifier';
    name: string;
    namespace?: string[];
}

export interface UnionType extends TypeAnnotation {
    kind: 'Union';
    types: TypeAnnotation[];
}

export interface IntersectionType extends TypeAnnotation {
    kind: 'Intersection';
    types: TypeAnnotation[];
}

export interface TupleType extends TypeAnnotation {
    kind: 'Tuple';
    elements: TypeAnnotation[];
}

export interface ArrayType extends TypeAnnotation {
    kind: 'Array';
    elementType: TypeAnnotation;
}

export interface ObjectTypeProperty {
    key: string;
    value: TypeAnnotation;
    optional: boolean;
    readonly: boolean;
}

export interface ObjectType extends TypeAnnotation {
    kind: 'Object';
    properties: ObjectTypeProperty[];
    indexSignature?: {
        keyType: TypeAnnotation;
        valueType: TypeAnnotation;
    };
}

export interface FunctionType extends TypeAnnotation {
    kind: 'Function';
    parameters: {
        name?: string;
        type: TypeAnnotation;
        optional: boolean;
    }[];
    returnType: TypeAnnotation;
    async: boolean;
    generator: boolean;
}

export interface GenericType extends TypeAnnotation {
    kind: 'Generic';
    base: TypeAnnotation;
    typeArguments: TypeAnnotation[];
}

export interface TypeParameter {
    name: string;
    constraint?: TypeAnnotation;
    default?: TypeAnnotation;
}

export interface ConditionalType extends TypeAnnotation {
    kind: 'Conditional';
    checkType: TypeAnnotation;
    extendsType: TypeAnnotation;
    trueType: TypeAnnotation;
    falseType: TypeAnnotation;
}

export interface MappedType extends TypeAnnotation {
    kind: 'Mapped';
    typeParameter: TypeParameter;
    nameType?: TypeAnnotation;
    optional?: boolean;
    readonly?: boolean;
}

export interface LiteralType extends TypeAnnotation {
    kind: 'Literal';
    value: string | number | boolean;
}

export interface KeyofType extends TypeAnnotation {
    kind: 'Keyof';
}

export interface TypeofType extends TypeAnnotation {
    kind: 'Typeof';
    expression: Expression;
}

// 工厂函数
export function createPrimitiveType(
    name: 'string' | 'number' | 'boolean' | 'null' | 'undefined' | 'any' | 'void',
    location: Location
): PrimitiveType {
    return {
        type: 'TypeAnnotation',
        kind: 'Primitive',
        name,
        location
    };
}

export function createIdentifierType(
    name: string,
    location: Location,
    namespace?: string[]
): IdentifierType {
    return {
        type: 'TypeAnnotation',
        kind: 'Identifier',
        name,
        namespace,
        location
    };
}

export function createUnionType(
    types: TypeAnnotation[],
    location: Location
): UnionType {
    return {
        type: 'TypeAnnotation',
        kind: 'Union',
        types,
        location
    };
}

export function createIntersectionType(
    types: TypeAnnotation[],
    location: Location
): IntersectionType {
    return {
        type: 'TypeAnnotation',
        kind: 'Intersection',
        types,
        location
    };
}

export function createFunctionType(
    parameters: { name?: string; type: TypeAnnotation; optional: boolean }[],
    returnType: TypeAnnotation,
    location: Location,
    async: boolean = false,
    generator: boolean = false
): FunctionType {
    return {
        type: 'TypeAnnotation',
        kind: 'Function',
        parameters,
        returnType,
        async,
        generator,
        location
    };
}

export function createGenericType(
    base: TypeAnnotation,
    typeArguments: TypeAnnotation[],
    location: Location
): GenericType {
    return {
        type: 'TypeAnnotation',
        kind: 'Generic',
        base,
        typeArguments,
        location
    };
}