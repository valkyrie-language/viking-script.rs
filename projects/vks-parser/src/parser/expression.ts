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
    Expression,
    Identifier,
    BinaryExpression,
    UnaryExpression,
    AssignmentExpression,
    CallExpression,
    MemberExpression,
    ConditionalExpression,
    ArrayExpression,
    ObjectExpression,
    FunctionExpression,
    ArrowFunctionExpression,
    YieldExpression,
    AwaitExpression,
    MatchExpression,
    MatchCase,
    ObjectProperty,
    createNamepath,
    createBinaryExpression,
    createCallExpression
} from 'viking-hir';
import { parseLiteral, parseIdentifier } from './literal';
import { parseTypeAnnotation } from './type';
import { parsePattern } from './pattern';
import { parseStatement, parseBlockStatement } from './statement';

// 标识符解析器
export function parseNamepath(): Parser<Identifier> {
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
            value: createNamepath(name, location, namespace),
            state
        };
    };
}

// 主表达式解析器
function parsePrimaryExpression(): Parser<Expression> {
    return choice(
        parseLiteral(),
        parseNamepath(),
        parseArrayExpression(),
        parseObjectExpression(),
        parseFunctionExpression(),
        parseMatchExpression(),
        map(sequence(matchString('('), parseExpression(), matchString(')')), ([, expr]) => expr)
    );
}

// 数组表达式解析器
export function parseArrayExpression(): Parser<ArrayExpression> {
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
                parseExpression(),
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
                type: 'ArrayExpression',
                elements: elementsResult.value,
                location
            },
            state
        };
    };
}

// 对象属性解析器
function parseObjectProperty(): Parser<ObjectProperty> {
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
                        key: createNamepath(keyResult.value, state.createLocation(state.position)),
                        value: createNamepath(keyResult.value, state.createLocation(state.position)),
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
        const valueResult = parseExpression()(state);
        if (!valueResult.success) {
            return valueResult;
        }
        
        return {
            success: true,
            value: {
                key: typeof keyResult.value === 'string' 
                    ? createNamepath(keyResult.value, state.createLocation(state.position))
                    : keyResult.value,
                value: valueResult.value,
                computed: typeof keyResult.value !== 'string',
                shorthand: false
            },
            state
        };
    };
}

// 对象表达式解析器
export function parseObjectExpression(): Parser<ObjectExpression> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        const openResult = matchString('{')(state);
        if (!openResult.success) {
            return openResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const propertiesResult = sepBy(parseObjectProperty(), matchString(','))(state);
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
                type: 'ObjectExpression',
                properties: propertiesResult.value,
                location
            },
            state
        };
    };
}

// 函数表达式解析器
export function parseFunctionExpression(): Parser<FunctionExpression> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        const asyncResult = optional(keyword('async'))(state);
        const async = asyncResult.value !== null;
        
        skipWhitespaceAndComments()(state);
        const generatorResult = optional(keyword('yield'))(state);
        const generator = generatorResult.value !== null;
        
        skipWhitespaceAndComments()(state);
        const functionResult = keyword('function')(state);
        if (!functionResult.success) {
            return functionResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const idResult = optional(parseNamepath())(state);
        
        skipWhitespaceAndComments()(state);
        const openResult = matchString('(')(state);
        if (!openResult.success) {
            return openResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const paramsResult = sepBy(parsePattern(), matchString(','))(state);
        if (!paramsResult.success) {
            return paramsResult;
        }
        
        skipWhitespaceAndComments()(state);
        const closeResult = matchString(')')(state);
        if (!closeResult.success) {
            return closeResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const returnTypeResult = optional(sequence(matchString('->'), parseTypeAnnotation()))(state);
        const returnType = returnTypeResult.value ? returnTypeResult.value[1] : undefined;
        
        skipWhitespaceAndComments()(state);
        const bodyResult = parseBlockStatement()(state);
        if (!bodyResult.success) {
            return bodyResult;
        }
        
        const location = state.createLocation(startPos);
        return {
            success: true,
            value: {
                type: 'FunctionExpression',
                id: idResult.value,
                params: paramsResult.value,
                body: bodyResult.value,
                async,
                generator,
                returnType,
                location
            },
            state
        };
    };
}

// 箭头函数表达式解析器
export function parseArrowFunctionExpression(): Parser<ArrowFunctionExpression> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        const asyncResult = optional(keyword('async'))(state);
        const async = asyncResult.value !== null;
        
        skipWhitespaceAndComments()(state);
        
        // 解析参数
        const paramsResult = choice(
            // 单个参数不带括号
            map(parseNamepath(), (id) => [{ type: 'Pattern', kind: 'Identifier', name: id.name, location: id.location }]),
            // 多个参数或带括号的参数
            map(sequence(matchString('('), sepBy(parsePattern(), matchString(',')), matchString(')')), ([, params]) => params)
        )(state);
        if (!paramsResult.success) {
            return paramsResult;
        }
        
        skipWhitespaceAndComments()(state);
        const returnTypeResult = optional(sequence(matchString('->'), parseTypeAnnotation()))(state);
        const returnType = returnTypeResult.value ? returnTypeResult.value[1] : undefined;
        
        skipWhitespaceAndComments()(state);
        const arrowResult = matchString('=>')(state);
        if (!arrowResult.success) {
            return arrowResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const bodyResult = choice(
            parseBlockStatement(),
            parseExpression()
        )(state);
        if (!bodyResult.success) {
            return bodyResult;
        }
        
        const location = state.createLocation(startPos);
        return {
            success: true,
            value: {
                type: 'ArrowFunctionExpression',
                params: paramsResult.value,
                body: bodyResult.value,
                async,
                returnType,
                location
            },
            state
        };
    };
}

// yield 表达式解析器
export function parseYieldExpression(): Parser<YieldExpression> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        const yieldResult = keyword('yield')(state);
        if (!yieldResult.success) {
            return yieldResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const fromResult = optional(keyword('from'))(state);
        const delegate = fromResult.value !== null;
        
        skipWhitespaceAndComments()(state);
        const argumentResult = optional(parseExpression())(state);
        
        const location = state.createLocation(startPos);
        return {
            success: true,
            value: {
                type: 'YieldExpression',
                argument: argumentResult.value,
                delegate,
                location
            },
            state
        };
    };
}

// await 表达式解析器
export function parseAwaitExpression(): Parser<AwaitExpression> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        const awaitResult = keyword('await')(state);
        if (!awaitResult.success) {
            return awaitResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const argumentResult = parseExpression()(state);
        if (!argumentResult.success) {
            return argumentResult;
        }
        
        const location = state.createLocation(startPos);
        return {
            success: true,
            value: {
                type: 'AwaitExpression',
                argument: argumentResult.value,
                location
            },
            state
        };
    };
}

// match case 解析器
function parseMatchCase(): Parser<MatchCase> {
    return (state: ParseState) => {
        skipWhitespaceAndComments()(state);
        
        const caseResult = keyword('case')(state);
        if (!caseResult.success) {
            return caseResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const patternResult = parsePattern()(state);
        if (!patternResult.success) {
            return patternResult;
        }
        
        skipWhitespaceAndComments()(state);
        const guardResult = optional(sequence(keyword('if'), parseExpression()))(state);
        const guard = guardResult.value ? guardResult.value[1] : undefined;
        
        skipWhitespaceAndComments()(state);
        const colonResult = matchString(':')(state);
        if (!colonResult.success) {
            return colonResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const consequentResult = many(parseStatement())(state);
        if (!consequentResult.success) {
            return consequentResult;
        }
        
        skipWhitespaceAndComments()(state);
        const fallthroughResult = optional(choice(
            map(keyword('fallthrough!'), () => ({ fallthrough: true, forced: true })),
            map(keyword('fallthrough'), () => ({ fallthrough: true, forced: false }))
        ))(state);
        
        const fallthrough = fallthroughResult.value?.fallthrough || false;
        const fallthroughForced = fallthroughResult.value?.forced || false;
        
        return {
            success: true,
            value: {
                pattern: patternResult.value,
                guard,
                consequent: consequentResult.value,
                fallthrough,
                fallthroughForced
            },
            state
        };
    };
}

// match 表达式解析器
export function parseMatchExpression(): Parser<MatchExpression> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        const matchResult = keyword('match')(state);
        if (!matchResult.success) {
            return matchResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const discriminantResult = parseExpression()(state);
        if (!discriminantResult.success) {
            return discriminantResult;
        }
        
        skipWhitespaceAndComments()(state);
        const openResult = matchString('{')(state);
        if (!openResult.success) {
            return openResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const casesResult = many(parseMatchCase())(state);
        if (!casesResult.success) {
            return casesResult;
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
                type: 'MatchExpression',
                discriminant: discriminantResult.value,
                cases: casesResult.value,
                location
            },
            state
        };
    };
}

// 后缀表达式解析器
function parsePostfixExpression(): Parser<Expression> {
    return (state: ParseState) => {
        let expr = parsePrimaryExpression()(state);
        if (!expr.success) {
            return expr;
        }
        
        while (state.notEof()) {
            const startState = state.clone();
            skipWhitespaceAndComments()(state);
            
            // 成员访问
            const dotResult = matchString('.')(state);
            if (dotResult.success) {
                skipWhitespaceAndComments()(state);
                const propertyResult = parseNamepath()(state);
                if (propertyResult.success) {
                    const location = state.createLocation(startState.position);
                    expr = {
                        success: true,
                        value: {
                            type: 'MemberExpression',
                            object: expr.value,
                            property: propertyResult.value,
                            computed: false,
                            location
                        },
                        state
                    };
                    continue;
                }
            }
            
            // 计算成员访问
            state.position = startState.position;
            skipWhitespaceAndComments()(state);
            const bracketResult = matchString('[')(state);
            if (bracketResult.success) {
                skipWhitespaceAndComments()(state);
                const propertyResult = parseExpression()(state);
                if (propertyResult.success) {
                    skipWhitespaceAndComments()(state);
                    const closeBracketResult = matchString(']')(state);
                    if (closeBracketResult.success) {
                        const location = state.createLocation(startState.position);
                        expr = {
                            success: true,
                            value: {
                                type: 'MemberExpression',
                                object: expr.value,
                                property: propertyResult.value,
                                computed: true,
                                location
                            },
                            state
                        };
                        continue;
                    }
                }
            }
            
            // 函数调用
            state.position = startState.position;
            skipWhitespaceAndComments()(state);
            const parenResult = matchString('(')(state);
            if (parenResult.success) {
                skipWhitespaceAndComments()(state);
                const argsResult = sepBy(parseExpression(), matchString(','))(state);
                if (argsResult.success) {
                    skipWhitespaceAndComments()(state);
                    const closeParenResult = matchString(')')(state);
                    if (closeParenResult.success) {
                        const location = state.createLocation(startState.position);
                        expr = {
                            success: true,
                            value: createCallExpression(expr.value, argsResult.value, location),
                            state
                        };
                        continue;
                    }
                }
            }
            
            // 泛型调用
            state.position = startState.position;
            skipWhitespaceAndComments()(state);
            const genericResult = matchString('::<')(state);
            if (genericResult.success) {
                skipWhitespaceAndComments()(state);
                const typeArgsResult = sepBy(parseTypeAnnotation(), matchString(','))(state);
                if (typeArgsResult.success) {
                    skipWhitespaceAndComments()(state);
                    const closeGenericResult = matchString('>')(state);
                    if (closeGenericResult.success) {
                        skipWhitespaceAndComments()(state);
                        const callParenResult = matchString('(')(state);
                        if (callParenResult.success) {
                            skipWhitespaceAndComments()(state);
                            const callArgsResult = sepBy(parseExpression(), matchString(','))(state);
                            if (callArgsResult.success) {
                                skipWhitespaceAndComments()(state);
                                const closeCallParenResult = matchString(')')(state);
                                if (closeCallParenResult.success) {
                                    const location = state.createLocation(startState.position);
                                    expr = {
                                        success: true,
                                        value: createCallExpression(expr.value, callArgsResult.value, location, typeArgsResult.value),
                                        state
                                    };
                                    continue;
                                }
                            }
                        }
                    }
                }
            }
            
            // 没有匹配到任何后缀操作符，退出循环
            state.position = startState.position;
            break;
        }
        
        return expr;
    };
}

// 一元表达式解析器
function parseUnaryExpression(): Parser<Expression> {
    return choice(
        parseYieldExpression(),
        parseAwaitExpression(),
        (state: ParseState) => {
            const startPos = state.position;
            skipWhitespaceAndComments()(state);
            
            const operators = ['+', '-', '!', '~', 'typeof', 'void', 'delete'];
            
            for (const op of operators) {
                const opResult = keyword(op)(state);
                if (opResult.success) {
                    skipWhitespaceAndComments()(state);
                    const argumentResult = parseUnaryExpression()(state);
                    if (argumentResult.success) {
                        const location = state.createLocation(startPos);
                        return {
                            success: true,
                            value: {
                                type: 'UnaryExpression',
                                operator: op,
                                argument: argumentResult.value,
                                prefix: true,
                                location
                            },
                            state
                        };
                    }
                }
            }
            
            return parsePostfixExpression()(state);
        }
    );
}

// 二元表达式解析器（使用优先级爬升算法）
function parseBinaryExpression(minPrec: number = 0): Parser<Expression> {
    return (state: ParseState) => {
        let left = parseUnaryExpression()(state);
        if (!left.success) {
            return left;
        }
        
        while (state.notEof()) {
            const startState = state.clone();
            skipWhitespaceAndComments()(state);
            
            // 获取操作符
            const operators = [
                { op: '**', prec: 14, assoc: 'right' },
                { op: '*', prec: 13, assoc: 'left' },
                { op: '/', prec: 13, assoc: 'left' },
                { op: '%', prec: 13, assoc: 'left' },
                { op: '+', prec: 12, assoc: 'left' },
                { op: '-', prec: 12, assoc: 'left' },
                { op: '<<', prec: 11, assoc: 'left' },
                { op: '>>', prec: 11, assoc: 'left' },
                { op: '>>>', prec: 11, assoc: 'left' },
                { op: '<', prec: 10, assoc: 'left' },
                { op: '<=', prec: 10, assoc: 'left' },
                { op: '>', prec: 10, assoc: 'left' },
                { op: '>=', prec: 10, assoc: 'left' },
                { op: 'in', prec: 10, assoc: 'left' },
                { op: 'instanceof', prec: 10, assoc: 'left' },
                { op: 'is', prec: 10, assoc: 'left' },
                { op: '==', prec: 9, assoc: 'left' },
                { op: '!=', prec: 9, assoc: 'left' },
                { op: '===', prec: 9, assoc: 'left' },
                { op: '!==', prec: 9, assoc: 'left' },
                { op: '&', prec: 8, assoc: 'left' },
                { op: '^', prec: 7, assoc: 'left' },
                { op: '|', prec: 6, assoc: 'left' },
                { op: '&&', prec: 5, assoc: 'left' },
                { op: '||', prec: 4, assoc: 'left' },
                { op: '??', prec: 4, assoc: 'left' }
            ];
            
            let foundOp = null;
            for (const opInfo of operators) {
                const opResult = matchString(opInfo.op)(state);
                if (opResult.success) {
                    foundOp = opInfo;
                    break;
                }
            }
            
            if (!foundOp || foundOp.prec < minPrec) {
                state.position = startState.position;
                break;
            }
            
            const nextMinPrec = foundOp.assoc === 'left' ? foundOp.prec + 1 : foundOp.prec;
            skipWhitespaceAndComments()(state);
            const right = parseBinaryExpression(nextMinPrec)(state);
            if (!right.success) {
                state.position = startState.position;
                break;
            }
            
            const location = state.createLocation(startState.position);
            left = {
                success: true,
                value: createBinaryExpression(foundOp.op, left.value, right.value, location),
                state
            };
        }
        
        return left;
    };
}

// 条件表达式解析器
function parseConditionalExpression(): Parser<Expression> {
    return (state: ParseState) => {
        const startPos = state.position;
        const testResult = parseBinaryExpression()(state);
        if (!testResult.success) {
            return testResult;
        }
        
        skipWhitespaceAndComments()(state);
        const questionResult = matchString('?')(state);
        if (!questionResult.success) {
            return testResult;
        }
        
        skipWhitespaceAndComments()(state);
        const consequentResult = parseExpression()(state);
        if (!consequentResult.success) {
            return consequentResult;
        }
        
        skipWhitespaceAndComments()(state);
        const colonResult = matchString(':')(state);
        if (!colonResult.success) {
            return colonResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const alternateResult = parseExpression()(state);
        if (!alternateResult.success) {
            return alternateResult;
        }
        
        const location = state.createLocation(startPos);
        return {
            success: true,
            value: {
                type: 'ConditionalExpression',
                test: testResult.value,
                consequent: consequentResult.value,
                alternate: alternateResult.value,
                location
            },
            state
        };
    };
}

// 赋值表达式解析器
function parseAssignmentExpression(): Parser<Expression> {
    return (state: ParseState) => {
        const startPos = state.position;
        const leftResult = parseConditionalExpression()(state);
        if (!leftResult.success) {
            return leftResult;
        }
        
        skipWhitespaceAndComments()(state);
        const operators = ['=', '+=', '-=', '*=', '/=', '%=', '**=', '<<=', '>>=', '>>>=', '&=', '^=', '|=', '&&=', '||=', '??='];
        
        for (const op of operators) {
            const opResult = matchString(op)(state);
            if (opResult.success) {
                skipWhitespaceAndComments()(state);
                const rightResult = parseAssignmentExpression()(state);
                if (rightResult.success) {
                    const location = state.createLocation(startPos);
                    return {
                        success: true,
                        value: {
                            type: 'AssignmentExpression',
                            operator: op,
                            left: leftResult.value,
                            right: rightResult.value,
                            location
                        },
                        state
                    };
                }
            }
        }
        
        return leftResult;
    };
}

// 主表达式解析器
export function parseExpression(): Parser<Expression> {
    return choice(
        parseArrowFunctionExpression(),
        parseAssignmentExpression()
    );
}