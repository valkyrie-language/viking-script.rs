import {
    Parser,
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
    Pattern,
    IdentifierPattern,
    LiteralPattern,
    ArrayPattern,
    ObjectPattern,
    RestPattern,
    WildcardPattern,
    TypePattern,
    ConditionPattern,
    DestructurePattern,
    GuardPattern,
    RangePattern,
    ObjectPatternProperty,
    createIdentifierPattern,
    createLiteralPattern,
    createWildcardPattern,
    createTypePattern,
    createDestructurePattern
} from 'viking-hir';
import { parseLiteral } from './literal';
import { parseTypeAnnotation } from './type';
import { parseExpression } from './expression';
import {ParseState} from "@helper/parseState";

// 标识符模式解析器
export function parseIdentifierPattern(): Parser<IdentifierPattern> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        const nameResult = parseIdentifier()(state);
        if (!nameResult.success) {
            return nameResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const typeAnnotationResult = optional(sequence(matchString(':'), parseTypeAnnotation()))(state);
        const typeAnnotation = typeAnnotationResult.value ? typeAnnotationResult.value[1] : undefined;
        
        const location = state.createLocation(startPos);
        return {
            success: true,
            value: createIdentifierPattern(nameResult.value, location, typeAnnotation),
            state
        };
    };
}

// 字面量模式解析器
export function parseLiteralPattern(): Parser<LiteralPattern> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        const literalResult = parseLiteral()(state);
        if (!literalResult.success) {
            return literalResult as any;
        }
        
        const location = state.createLocation(startPos);
        return {
            success: true,
            value: createLiteralPattern(literalResult.value.value, location),
            state
        };
    };
}

// 通配符模式解析器
export function parseWildcardPattern(): Parser<WildcardPattern> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        const wildcardResult = matchString('_')(state);
        if (!wildcardResult.success) {
            return wildcardResult as any;
        }
        
        const location = state.createLocation(startPos);
        return {
            success: true,
            value: createWildcardPattern(location),
            state
        };
    };
}

// 数组模式解析器
export function parseArrayPattern(): Parser<ArrayPattern> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        const openResult = matchString('[')(state);
        if (!openResult.success) {
            return openResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const elementsResult = sepBy(
            choice(
                parsePattern(),
                map(matchString(''), () => null) // 空元素
            ),
            matchString(',')
        )(state);
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
                type: 'Pattern',
                kind: 'Array',
                elements: elementsResult.value,
                location
            },
            state
        };
    };
}

// 对象模式属性解析器
function parseObjectPatternProperty(): Parser<ObjectPatternProperty> {
    return (state: ParseState) => {
        skipWhitespaceAndComments()(state);
        
        // 解析键
        const keyResult = choice(
            parseIdentifier(),
            map(sequence(matchString('['), parseExpression(), matchString(']')), ([, expr]) => expr)
        )(state);
        if (!keyResult.success) {
            return keyResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        
        // 检查是否是简写形式
        const colonResult = optional(matchString(':'))(state);
        if (colonResult.value === null) {
            // 简写形式: { name } 等价于 { name: name }
            if (typeof keyResult.value === 'string') {
                return {
                    success: true,
                    value: {
                        key: { type: 'Identifier', name: keyResult.value } as any,
                        value: createIdentifierPattern(keyResult.value, state.createLocation(state.position)),
                        computed: false,
                        shorthand: true
                    },
                    state
                };
            } else {
                state.addError('Computed property cannot use shorthand syntax');
                return {
                    success: false,
                    errors: state.errors,
                    state
                };
            }
        }
        
        skipWhitespaceAndComments()(state);
        const valueResult = parsePattern()(state);
        if (!valueResult.success) {
            return valueResult;
        }
        
        return {
            success: true,
            value: {
                key: typeof keyResult.value === 'string' 
                    ? { type: 'Identifier', name: keyResult.value } as any
                    : keyResult.value,
                value: valueResult.value,
                computed: typeof keyResult.value !== 'string',
                shorthand: false
            },
            state
        };
    };
}

// 对象模式解析器
export function parseObjectPattern(): Parser<ObjectPattern> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        const openResult = matchString('{')(state);
        if (!openResult.success) {
            return openResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const propertiesResult = sepBy(parseObjectPatternProperty(), matchString(','))(state);
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
                type: 'Pattern',
                kind: 'Object',
                properties: propertiesResult.value,
                location
            },
            state
        };
    };
}

// 剩余模式解析器
export function parseRestPattern(): Parser<RestPattern> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        const restResult = matchString('...')(state);
        if (!restResult.success) {
            return restResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const argumentResult = parsePattern()(state);
        if (!argumentResult.success) {
            return argumentResult;
        }
        
        const location = state.createLocation(startPos);
        return {
            success: true,
            value: {
                type: 'Pattern',
                kind: 'Rest',
                argument: argumentResult.value,
                location
            },
            state
        };
    };
}

// 类型模式解析器
export function parseTypePattern(): Parser<TypePattern> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        const typeKeywordResult = keyword('type')(state);
        if (!typeKeywordResult.success) {
            return typeKeywordResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const typeAnnotationResult = parseTypeAnnotation()(state);
        if (!typeAnnotationResult.success) {
            return typeAnnotationResult;
        }
        
        skipWhitespaceAndComments()(state);
        const conditionResult = optional(sequence(keyword('if'), parseExpression()))(state);
        const condition = conditionResult.value ? conditionResult.value[1] : undefined;
        
        const location = state.createLocation(startPos);
        return {
            success: true,
            value: createTypePattern(typeAnnotationResult.value, location, condition),
            state
        };
    };
}

// 条件模式解析器
export function parseConditionPattern(): Parser<ConditionPattern> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        const caseKeywordResult = keyword('case')(state);
        if (!caseKeywordResult.success) {
            return caseKeywordResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const conditionResult = parseExpression()(state);
        if (!conditionResult.success) {
            return conditionResult;
        }
        
        const location = state.createLocation(startPos);
        return {
            success: true,
            value: {
                type: 'Pattern',
                kind: 'Condition',
                condition: conditionResult.value,
                location
            },
            state
        };
    };
}

// 解构模式解析器
export function parseDestructurePattern(): Parser<DestructurePattern> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        const typeNameResult = parseIdentifier()(state);
        if (!typeNameResult.success) {
            return typeNameResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const openResult = matchString('{')(state);
        if (!openResult.success) {
            return openResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const fieldsResult = sepBy(
            sequence(parseIdentifier(), optional(sequence(matchString(':'), parsePattern()))),
            matchString(',')
        )(state);
        if (!fieldsResult.success) {
            return fieldsResult;
        }
        
        const fields = fieldsResult.value.map(([name, patternPair]) => ({
            name,
            pattern: patternPair ? patternPair[1] : createIdentifierPattern(name, state.createLocation(state.position))
        }));
        
        skipWhitespaceAndComments()(state);
        const closeResult = matchString('}')(state);
        if (!closeResult.success) {
            return closeResult as any;
        }
        
        const location = state.createLocation(startPos);
        return {
            success: true,
            value: createDestructurePattern(typeNameResult.value, fields, location),
            state
        };
    };
}

// 守卫模式解析器
export function parseGuardPattern(): Parser<GuardPattern> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        const patternResult = parseBasePattern()(state);
        if (!patternResult.success) {
            return patternResult;
        }
        
        skipWhitespaceAndComments()(state);
        const ifKeywordResult = keyword('if')(state);
        if (!ifKeywordResult.success) {
            return ifKeywordResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const guardResult = parseExpression()(state);
        if (!guardResult.success) {
            return guardResult;
        }
        
        const location = state.createLocation(startPos);
        return {
            success: true,
            value: {
                type: 'Pattern',
                kind: 'Guard',
                pattern: patternResult.value,
                guard: guardResult.value,
                location
            },
            state
        };
    };
}

// 范围模式解析器
export function parseRangePattern(): Parser<RangePattern> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        const startResult = parseExpression()(state);
        if (!startResult.success) {
            return startResult;
        }
        
        skipWhitespaceAndComments()(state);
        const rangeOpResult = choice(
            matchString('..='), // 包含结束
            matchString('..') // 不包含结束
        )(state);
        if (!rangeOpResult.success) {
            return rangeOpResult as any;
        }
        
        const inclusive = rangeOpResult.value === '..=';
        
        skipWhitespaceAndComments()(state);
        const endResult = parseExpression()(state);
        if (!endResult.success) {
            return endResult;
        }
        
        const location = state.createLocation(startPos);
        return {
            success: true,
            value: {
                type: 'Pattern',
                kind: 'Range',
                start: startResult.value,
                end: endResult.value,
                inclusive,
                location
            },
            state
        };
    };
}

// 基础模式解析器（不包括守卫）
function parseBasePattern(): Parser<Pattern> {
    return choice(
        parseWildcardPattern(),
        parseRestPattern(),
        parseTypePattern(),
        parseConditionPattern(),
        parseDestructurePattern(),
        parseArrayPattern(),
        parseObjectPattern(),
        parseLiteralPattern(),
        parseIdentifierPattern(),
        parseRangePattern(),
        map(sequence(matchString('('), parsePattern(), matchString(')')), ([, pattern]) => pattern)
    );
}

// 主要模式解析器
export function parsePattern(): Parser<Pattern> {
    return choice(
        parseGuardPattern(),
        parseBasePattern()
    );
}