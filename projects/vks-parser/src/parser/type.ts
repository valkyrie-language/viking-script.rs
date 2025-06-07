import {
    Parser,
    ParseState,
    ParseResult,
    map,
    choice,
    sequence,
    optional,
    many,
    sepBy,
    keyword,
    parseIdentifier,
    matchString,
    skipWhitespaceAndComments
} from '../helper';
import {
    TypeAnnotation,
    PrimitiveType,
    IdentifierType,
    UnionType,
    IntersectionType,
    TupleType,
    ArrayType,
    ObjectType,
    FunctionType,
    GenericType,
    ConditionalType,
    MappedType,
    LiteralType,
    TypeParameter,
    ObjectTypeProperty
} from 'viking-hir';

// 基础类型解析器
export function parsePrimitiveType(): Parser<PrimitiveType> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        const primitiveTypes = ['string', 'number', 'boolean', 'null', 'undefined', 'any', 'void'];
        
        for (const typeName of primitiveTypes) {
            const result = keyword(typeName)(state);
            if (result.success) {
                const location = state.createLocation(startPos);
                return {
                    success: true,
                    value: {
                        type: 'TypeAnnotation',
                        kind: 'Primitive',
                        name: typeName as any,
                        location
                    },
                    state
                };
            }
        }
        
        state.addError('Expected primitive type');
        return {
            success: false,
            errors: state.errors,
            state
        };
    };
}

// 标识符类型解析器
export function parseIdentifierType(): Parser<IdentifierType> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        // 解析命名空间
        const namespaceResult = sepBy(parseIdentifier(), matchString('.'))(state);
        if (!namespaceResult.success || namespaceResult.value.length === 0) {
            return namespaceResult as any;
        }
        
        const parts = namespaceResult.value;
        const name = parts[parts.length - 1];
        const namespace = parts.length > 1 ? parts.slice(0, -1) : undefined;
        
        const location = state.createLocation(startPos);
        return {
            success: true,
            value: {
                type: 'TypeAnnotation',
                kind: 'Identifier',
                name,
                namespace,
                location
            },
            state
        };
    };
}

// 数组类型解析器
export function parseArrayType(): Parser<ArrayType> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        const elementTypeResult = parseTypeAnnotation()(state);
        if (!elementTypeResult.success) {
            return elementTypeResult;
        }
        
        skipWhitespaceAndComments()(state);
        const bracketResult = matchString('[]')(state);
        if (!bracketResult.success) {
            return bracketResult as any;
        }
        
        const location = state.createLocation(startPos);
        return {
            success: true,
            value: {
                type: 'TypeAnnotation',
                kind: 'Array',
                elementType: elementTypeResult.value,
                location
            },
            state
        };
    };
}

// 元组类型解析器
export function parseTupleType(): Parser<TupleType> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        const openResult = matchString('[')(state);
        if (!openResult.success) {
            return openResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const elementsResult = sepBy(parseTypeAnnotation(), matchString(','))(state);
        if (!elementsResult.success) {
            return elementsResult;
        }
        
        skipWhitespaceAndComments()(state);
        const closeResult = matchString(']')(state);
        if (!closeResult.success) {
            return closeResult as any;
        }
        
        const location = state.createLocation(startPos);
        return {
            success: true,
            value: {
                type: 'TypeAnnotation',
                kind: 'Tuple',
                elements: elementsResult.value,
                location
            },
            state
        };
    };
}

// 对象类型属性解析器
function parseObjectTypeProperty(): Parser<ObjectTypeProperty> {
    return (state: ParseState) => {
        skipWhitespaceAndComments()(state);
        
        const readonlyResult = optional(keyword('readonly'))(state);
        const readonly = readonlyResult.value !== null;
        
        skipWhitespaceAndComments()(state);
        const keyResult = parseIdentifier()(state);
        if (!keyResult.success) {
            return keyResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const optionalResult = optional(matchString('?'))(state);
        const optional = optionalResult.value !== null;
        
        skipWhitespaceAndComments()(state);
        const colonResult = matchString(':')(state);
        if (!colonResult.success) {
            return colonResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const valueResult = parseTypeAnnotation()(state);
        if (!valueResult.success) {
            return valueResult;
        }
        
        return {
            success: true,
            value: {
                key: keyResult.value,
                value: valueResult.value,
                optional,
                readonly
            },
            state
        };
    };
}

// 对象类型解析器
export function parseObjectType(): Parser<ObjectType> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        const openResult = matchString('{')(state);
        if (!openResult.success) {
            return openResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const propertiesResult = sepBy(parseObjectTypeProperty(), matchString(','))(state);
        if (!propertiesResult.success) {
            return propertiesResult;
        }
        
        skipWhitespaceAndComments()(state);
        const closeResult = matchString('}')(state);
        if (!closeResult.success) {
            return closeResult as any;
        }
        
        const location = state.createLocation(startPos);
        return {
            success: true,
            value: {
                type: 'TypeAnnotation',
                kind: 'Object',
                properties: propertiesResult.value,
                location
            },
            state
        };
    };
}

// 函数类型参数解析器
function parseFunctionTypeParameter(): Parser<{ name?: string; type: TypeAnnotation; optional: boolean }> {
    return (state: ParseState) => {
        skipWhitespaceAndComments()(state);
        
        // 尝试解析参数名
        const nameResult = optional(sequence(parseIdentifier(), matchString(':')))(state);
        const name = nameResult.value ? nameResult.value[0] : undefined;
        
        skipWhitespaceAndComments()(state);
        const typeResult = parseTypeAnnotation()(state);
        if (!typeResult.success) {
            return typeResult;
        }
        
        skipWhitespaceAndComments()(state);
        const optionalResult = optional(matchString('?'))(state);
        const optional = optionalResult.value !== null;
        
        return {
            success: true,
            value: {
                name,
                type: typeResult.value,
                optional
            },
            state
        };
    };
}

// 函数类型解析器
export function parseFunctionType(): Parser<FunctionType> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        const asyncResult = optional(keyword('async'))(state);
        const async = asyncResult.value !== null;
        
        skipWhitespaceAndComments()(state);
        const generatorResult = optional(keyword('function'))(state);
        const generator = generatorResult.value !== null;
        
        skipWhitespaceAndComments()(state);
        const openResult = matchString('(')(state);
        if (!openResult.success) {
            return openResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const parametersResult = sepBy(parseFunctionTypeParameter(), matchString(','))(state);
        if (!parametersResult.success) {
            return parametersResult;
        }
        
        skipWhitespaceAndComments()(state);
        const closeResult = matchString(')')(state);
        if (!closeResult.success) {
            return closeResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const arrowResult = matchString('->')(state);
        if (!arrowResult.success) {
            return arrowResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const returnTypeResult = parseTypeAnnotation()(state);
        if (!returnTypeResult.success) {
            return returnTypeResult;
        }
        
        const location = state.createLocation(startPos);
        return {
            success: true,
            value: {
                type: 'TypeAnnotation',
                kind: 'Function',
                parameters: parametersResult.value,
                returnType: returnTypeResult.value,
                async,
                generator,
                location
            },
            state
        };
    };
}

// 泛型类型解析器
export function parseGenericType(): Parser<GenericType> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        const baseResult = choice(
            parseIdentifierType(),
            parsePrimitiveType()
        )(state);
        if (!baseResult.success) {
            return baseResult;
        }
        
        skipWhitespaceAndComments()(state);
        const openResult = matchString('::<')(state);
        if (!openResult.success) {
            return openResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const typeArgumentsResult = sepBy(parseTypeAnnotation(), matchString(','))(state);
        if (!typeArgumentsResult.success) {
            return typeArgumentsResult;
        }
        
        skipWhitespaceAndComments()(state);
        const closeResult = matchString('>')(state);
        if (!closeResult.success) {
            return closeResult as any;
        }
        
        const location = state.createLocation(startPos);
        return {
            success: true,
            value: {
                type: 'TypeAnnotation',
                kind: 'Generic',
                base: baseResult.value,
                typeArguments: typeArgumentsResult.value,
                location
            },
            state
        };
    };
}

// 联合类型解析器
export function parseUnionType(): Parser<UnionType> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        const typesResult = sepBy(parseAtomicType(), matchString('|'))(state);
        if (!typesResult.success || typesResult.value.length < 2) {
            return typesResult as any;
        }
        
        const location = state.createLocation(startPos);
        return {
            success: true,
            value: {
                type: 'TypeAnnotation',
                kind: 'Union',
                types: typesResult.value,
                location
            },
            state
        };
    };
}

// 交集类型解析器
export function parseIntersectionType(): Parser<IntersectionType> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        const typesResult = sepBy(parseAtomicType(), matchString('&'))(state);
        if (!typesResult.success || typesResult.value.length < 2) {
            return typesResult as any;
        }
        
        const location = state.createLocation(startPos);
        return {
            success: true,
            value: {
                type: 'TypeAnnotation',
                kind: 'Intersection',
                types: typesResult.value,
                location
            },
            state
        };
    };
}

// 原子类型解析器（最基础的类型，不包括联合和交集）
function parseAtomicType(): Parser<TypeAnnotation> {
    return choice(
        parsePrimitiveType(),
        parseGenericType(),
        parseIdentifierType(),
        parseArrayType(),
        parseTupleType(),
        parseObjectType(),
        parseFunctionType(),
        map(sequence(matchString('('), parseTypeAnnotation(), matchString(')')), ([, type]) => type)
    );
}

// 基础类型解析器（包括联合和交集）
function parseBaseType(): Parser<TypeAnnotation> {
    return choice(
        parseUnionType(),
        parseIntersectionType(),
        parseAtomicType()
    );
}

// 主要类型注解解析器
export function parseTypeAnnotation(): Parser<TypeAnnotation> {
    return parseBaseType();
}

// 类型参数解析器
export function parseTypeParameter(): Parser<TypeParameter> {
    return (state: ParseState) => {
        skipWhitespaceAndComments()(state);
        
        const nameResult = parseIdentifier()(state);
        if (!nameResult.success) {
            return nameResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const constraintResult = optional(sequence(keyword('extends'), parseTypeAnnotation()))(state);
        const constraint = constraintResult.value ? constraintResult.value[1] : undefined;
        
        skipWhitespaceAndComments()(state);
        const defaultResult = optional(sequence(matchString('='), parseTypeAnnotation()))(state);
        const defaultType = defaultResult.value ? defaultResult.value[1] : undefined;
        
        return {
            success: true,
            value: {
                name: nameResult.value,
                constraint,
                default: defaultType
            },
            state
        };
    };
}