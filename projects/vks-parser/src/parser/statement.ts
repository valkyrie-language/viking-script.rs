import {
    Parser,
    ParseState,
    ParseResult,
    map,
    choice,
    sequence,
    optional,
    many,
    many1,
    sepBy,
    keyword,
    parseIdentifier,
    matchString,
    skipWhitespaceAndComments
} from '../helper';
import {
    Statement,
    Program,
    ExpressionStatement,
    BlockStatement,
    VariableDeclarator,
    VariableDeclaration,
    FunctionDeclaration,
    ClassProperty,
    ClassMethod,
    ClassDeclaration,
    UnionVariant,
    UnionDeclaration,
    TraitMethod,
    TraitDeclaration,
    ImplDeclaration,
    IfStatement,
    MatchStatement,
    LoopStatement,
    BreakStatement,
    ContinueStatement,
    ReturnStatement,
    TryStatement,
    HandlerStatement,
    RaiseStatement,
    MacroDeclaration,
    TypeDeclaration,
    NamespaceDeclaration,
    ImportDeclaration,
    ImportSpecifier,
    createProgram,
    createExpressionStatement,
    createBlockStatement,
    createVariableDeclaration,
    createFunctionDeclaration,
    createClassDeclaration,
    createIfStatement
} from 'viking-hir';
import { parseExpression, parseNamepath } from './expression';
import { parseTypeAnnotation, parseTypeParameter } from './type';
import { parsePattern } from './pattern';

// 程序解析器
export function parseProgram(): Parser<Program> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        const bodyResult = many(parseStatement())(state);
        if (!bodyResult.success) {
            return bodyResult;
        }
        
        const location = state.createLocation(startPos);
        return {
            success: true,
            value: createProgram(bodyResult.value, location),
            state
        };
    };
}

// 表达式语句解析器
export function parseExpressionStatement(): Parser<ExpressionStatement> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        const expressionResult = parseExpression()(state);
        if (!expressionResult.success) {
            return expressionResult;
        }
        
        skipWhitespaceAndComments()(state);
        optional(matchString(';'))(state);
        
        const location = state.createLocation(startPos);
        return {
            success: true,
            value: createExpressionStatement(expressionResult.value, location),
            state
        };
    };
}

// 块语句解析器
export function parseBlockStatement(): Parser<BlockStatement> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        const openResult = matchString('{')(state);
        if (!openResult.success) {
            return openResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const bodyResult = many(parseStatement())(state);
        if (!bodyResult.success) {
            return bodyResult;
        }
        
        skipWhitespaceAndComments()(state);
        const closeResult = matchString('}')(state);
        if (!closeResult.success) {
            return closeResult as any;
        }
        
        const location = state.createLocation(startPos);
        return {
            success: true,
            value: createBlockStatement(bodyResult.value, location),
            state
        };
    };
}

// 变量声明器解析器
function parseVariableDeclarator(): Parser<VariableDeclarator> {
    return (state: ParseState) => {
        skipWhitespaceAndComments()(state);
        
        const idResult = parsePattern()(state);
        if (!idResult.success) {
            return idResult;
        }
        
        skipWhitespaceAndComments()(state);
        const typeResult = optional(sequence(matchString(':'), parseTypeAnnotation()))(state);
        const typeAnnotation = typeResult.value ? typeResult.value[1] : undefined;
        
        skipWhitespaceAndComments()(state);
        const initResult = optional(sequence(matchString('='), parseExpression()))(state);
        const init = initResult.value ? initResult.value[1] : undefined;
        
        return {
            success: true,
            value: {
                id: idResult.value,
                typeAnnotation,
                init
            },
            state
        };
    };
}

// 变量声明解析器
export function parseVariableDeclaration(): Parser<VariableDeclaration> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        const kindResult = choice(
            keyword('let'),
            keyword('const'),
            keyword('var')
        )(state);
        if (!kindResult.success) {
            return kindResult as any;
        }
        
        let kind = kindResult.value;
        let mutable = false;
        
        // 检查是否是可变变量
        if (kind === 'let') {
            skipWhitespaceAndComments()(state);
            const mutResult = optional(keyword('mut'))(state);
            if (mutResult.value !== null) {
                mutable = true;
            }
        }
        
        skipWhitespaceAndComments()(state);
        const declarationsResult = sepBy(parseVariableDeclarator(), matchString(','))(state);
        if (!declarationsResult.success) {
            return declarationsResult;
        }
        
        skipWhitespaceAndComments()(state);
        optional(matchString(';'))(state);
        
        const location = state.createLocation(startPos);
        return {
            success: true,
            value: createVariableDeclaration(declarationsResult.value, kind, location, mutable),
            state
        };
    };
}

// 函数声明解析器
export function parseFunctionDeclaration(): Parser<FunctionDeclaration> {
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
        const idResult = parseNamepath()(state);
        if (!idResult.success) {
            return idResult;
        }
        
        skipWhitespaceAndComments()(state);
        const typeParamsResult = optional(sequence(
            matchString('<'),
            sepBy(parseTypeParameter(), matchString(',')),
            matchString('>')
        ))(state);
        const typeParameters = typeParamsResult.value ? typeParamsResult.value[1] : undefined;
        
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
            value: createFunctionDeclaration(idResult.value, paramsResult.value, bodyResult.value, location, {
                async,
                generator,
                returnType,
                typeParameters
            }),
            state
        };
    };
}

// 类属性解析器
function parseClassProperty(): Parser<ClassProperty> {
    return (state: ParseState) => {
        skipWhitespaceAndComments()(state);
        
        const staticResult = optional(keyword('static'))(state);
        const isStatic = staticResult.value !== null;
        
        skipWhitespaceAndComments()(state);
        const keyResult = parseNamepath()(state);
        if (!keyResult.success) {
            return keyResult;
        }
        
        skipWhitespaceAndComments()(state);
        const typeResult = optional(sequence(matchString(':'), parseTypeAnnotation()))(state);
        const typeAnnotation = typeResult.value ? typeResult.value[1] : undefined;
        
        skipWhitespaceAndComments()(state);
        const valueResult = optional(sequence(matchString('='), parseExpression()))(state);
        const value = valueResult.value ? valueResult.value[1] : undefined;
        
        skipWhitespaceAndComments()(state);
        optional(matchString(';'))(state);
        
        return {
            success: true,
            value: {
                key: keyResult.value,
                value,
                typeAnnotation,
                static: isStatic,
                computed: false
            },
            state
        };
    };
}

// 类方法解析器
function parseClassMethod(): Parser<ClassMethod> {
    return (state: ParseState) => {
        skipWhitespaceAndComments()(state);
        
        const staticResult = optional(keyword('static'))(state);
        const isStatic = staticResult.value !== null;
        
        skipWhitespaceAndComments()(state);
        const asyncResult = optional(keyword('async'))(state);
        const async = asyncResult.value !== null;
        
        skipWhitespaceAndComments()(state);
        const generatorResult = optional(keyword('yield'))(state);
        const generator = generatorResult.value !== null;
        
        skipWhitespaceAndComments()(state);
        
        // 检查是否是构造函数
        const constructorResult = optional(keyword('constructor'))(state);
        const isConstructor = constructorResult.value !== null;
        
        let keyResult;
        if (isConstructor) {
            keyResult = {
                success: true,
                value: { type: 'Identifier', name: 'constructor', location: state.createLocation(state.position) },
                state
            };
        } else {
            keyResult = parseNamepath()(state);
            if (!keyResult.success) {
                return keyResult;
            }
        }
        
        skipWhitespaceAndComments()(state);
        const typeParamsResult = optional(sequence(
            matchString('<'),
            sepBy(parseTypeParameter(), matchString(',')),
            matchString('>')
        ))(state);
        const typeParameters = typeParamsResult.value ? typeParamsResult.value[1] : undefined;
        
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
        
        return {
            success: true,
            value: {
                key: keyResult.value,
                value: {
                    type: 'FunctionExpression',
                    id: null,
                    params: paramsResult.value,
                    body: bodyResult.value,
                    async,
                    generator,
                    returnType,
                    typeParameters,
                    location: bodyResult.value.location
                },
                kind: isConstructor ? 'constructor' : 'method',
                computed: false,
                static: isStatic
            },
            state
        };
    };
}

// 类声明解析器
export function parseClassDeclaration(): Parser<ClassDeclaration> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        const classResult = keyword('class')(state);
        if (!classResult.success) {
            return classResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const idResult = parseNamepath()(state);
        if (!idResult.success) {
            return idResult;
        }
        
        skipWhitespaceAndComments()(state);
        const typeParamsResult = optional(sequence(
            matchString('<'),
            sepBy(parseTypeParameter(), matchString(',')),
            matchString('>')
        ))(state);
        const typeParameters = typeParamsResult.value ? typeParamsResult.value[1] : undefined;
        
        skipWhitespaceAndComments()(state);
        const superClassResult = optional(sequence(keyword('extends'), parseExpression()))(state);
        const superClass = superClassResult.value ? superClassResult.value[1] : undefined;
        
        skipWhitespaceAndComments()(state);
        const openResult = matchString('{')(state);
        if (!openResult.success) {
            return openResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const bodyResult = many(choice(
            parseClassMethod(),
            parseClassProperty()
        ))(state);
        if (!bodyResult.success) {
            return bodyResult;
        }
        
        skipWhitespaceAndComments()(state);
        const closeResult = matchString('}')(state);
        if (!closeResult.success) {
            return closeResult as any;
        }
        
        const location = state.createLocation(startPos);
        return {
            success: true,
            value: createClassDeclaration(idResult.value, superClass, bodyResult.value, location, typeParameters),
            state
        };
    };
}

// 联合变体解析器
function parseUnionVariant(): Parser<UnionVariant> {
    return (state: ParseState) => {
        skipWhitespaceAndComments()(state);
        
        const idResult = parseNamepath()(state);
        if (!idResult.success) {
            return idResult;
        }
        
        skipWhitespaceAndComments()(state);
        const openResult = matchString('{')(state);
        if (!openResult.success) {
            return openResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const propertiesResult = many(parseClassProperty())(state);
        if (!propertiesResult.success) {
            return propertiesResult;
        }
        
        skipWhitespaceAndComments()(state);
        const closeResult = matchString('}')(state);
        if (!closeResult.success) {
            return closeResult as any;
        }
        
        return {
            success: true,
            value: {
                id: idResult.value,
                properties: propertiesResult.value
            },
            state
        };
    };
}

// 联合声明解析器
export function parseUnionDeclaration(): Parser<UnionDeclaration> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        const unionResult = keyword('union')(state);
        if (!unionResult.success) {
            return unionResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const idResult = parseNamepath()(state);
        if (!idResult.success) {
            return idResult;
        }
        
        skipWhitespaceAndComments()(state);
        const typeParamsResult = optional(sequence(
            matchString('<'),
            sepBy(parseTypeParameter(), matchString(',')),
            matchString('>')
        ))(state);
        const typeParameters = typeParamsResult.value ? typeParamsResult.value[1] : undefined;
        
        skipWhitespaceAndComments()(state);
        const openResult = matchString('{')(state);
        if (!openResult.success) {
            return openResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const variantsResult = many(parseUnionVariant())(state);
        if (!variantsResult.success) {
            return variantsResult;
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
                type: 'UnionDeclaration',
                id: idResult.value,
                variants: variantsResult.value,
                typeParameters,
                location
            },
            state
        };
    };
}

// trait 方法解析器
function parseTraitMethod(): Parser<TraitMethod> {
    return (state: ParseState) => {
        skipWhitespaceAndComments()(state);
        
        const asyncResult = optional(keyword('async'))(state);
        const async = asyncResult.value !== null;
        
        skipWhitespaceAndComments()(state);
        const generatorResult = optional(keyword('yield'))(state);
        const generator = generatorResult.value !== null;
        
        skipWhitespaceAndComments()(state);
        const keyResult = parseNamepath()(state);
        if (!keyResult.success) {
            return keyResult;
        }
        
        skipWhitespaceAndComments()(state);
        const typeParamsResult = optional(sequence(
            matchString('<'),
            sepBy(parseTypeParameter(), matchString(',')),
            matchString('>')
        ))(state);
        const typeParameters = typeParamsResult.value ? typeParamsResult.value[1] : undefined;
        
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
        const bodyResult = optional(parseBlockStatement())(state);
        
        skipWhitespaceAndComments()(state);
        optional(matchString(';'))(state);
        
        return {
            success: true,
            value: {
                key: keyResult.value,
                params: paramsResult.value,
                returnType,
                body: bodyResult.value,
                async,
                generator,
                typeParameters
            },
            state
        };
    };
}

// trait 声明解析器
export function parseTraitDeclaration(): Parser<TraitDeclaration> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        const traitResult = keyword('trait')(state);
        if (!traitResult.success) {
            return traitResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const idResult = parseNamepath()(state);
        if (!idResult.success) {
            return idResult;
        }
        
        skipWhitespaceAndComments()(state);
        const typeParamsResult = optional(sequence(
            matchString('<'),
            sepBy(parseTypeParameter(), matchString(',')),
            matchString('>')
        ))(state);
        const typeParameters = typeParamsResult.value ? typeParamsResult.value[1] : undefined;
        
        skipWhitespaceAndComments()(state);
        const openResult = matchString('{')(state);
        if (!openResult.success) {
            return openResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const methodsResult = many(parseTraitMethod())(state);
        if (!methodsResult.success) {
            return methodsResult;
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
                type: 'TraitDeclaration',
                id: idResult.value,
                methods: methodsResult.value,
                typeParameters,
                location
            },
            state
        };
    };
}

// impl 声明解析器
export function parseImplDeclaration(): Parser<ImplDeclaration> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        const implResult = keyword('impl')(state);
        if (!implResult.success) {
            return implResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const traitResult = parseTypeAnnotation()(state);
        if (!traitResult.success) {
            return traitResult;
        }
        
        skipWhitespaceAndComments()(state);
        const forResult = keyword('for')(state);
        if (!forResult.success) {
            return forResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const targetResult = parseTypeAnnotation()(state);
        if (!targetResult.success) {
            return targetResult;
        }
        
        skipWhitespaceAndComments()(state);
        const openResult = matchString('{')(state);
        if (!openResult.success) {
            return openResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const methodsResult = many(parseClassMethod())(state);
        if (!methodsResult.success) {
            return methodsResult;
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
                type: 'ImplDeclaration',
                trait: traitResult.value,
                target: targetResult.value,
                methods: methodsResult.value,
                location
            },
            state
        };
    };
}

// if 语句解析器
export function parseIfStatement(): Parser<IfStatement> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        const ifResult = keyword('if')(state);
        if (!ifResult.success) {
            return ifResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const testResult = parseExpression()(state);
        if (!testResult.success) {
            return testResult;
        }
        
        skipWhitespaceAndComments()(state);
        const consequentResult = parseBlockStatement()(state);
        if (!consequentResult.success) {
            return consequentResult;
        }
        
        skipWhitespaceAndComments()(state);
        const alternateResult = optional(sequence(
            keyword('else'),
            choice(
                parseIfStatement(),
                parseBlockStatement()
            )
        ))(state);
        const alternate = alternateResult.value ? alternateResult.value[1] : undefined;
        
        const location = state.createLocation(startPos);
        return {
            success: true,
            value: createIfStatement(testResult.value, consequentResult.value, alternate, location),
            state
        };
    };
}

// match 语句解析器
export function parseMatchStatement(): Parser<MatchStatement> {
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
        const casesResult = many((state: ParseState) => {
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
        })(state);
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
                type: 'MatchStatement',
                discriminant: discriminantResult.value,
                cases: casesResult.value,
                location
            },
            state
        };
    };
}

// 循环语句解析器
export function parseLoopStatement(): Parser<LoopStatement> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        const loopResult = keyword('loop')(state);
        if (!loopResult.success) {
            return loopResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const labelResult = optional(sequence(keyword('label'), parseNamepath()))(state);
        const label = labelResult.value ? labelResult.value[1] : undefined;
        
        skipWhitespaceAndComments()(state);
        const bodyResult = parseBlockStatement()(state);
        if (!bodyResult.success) {
            return bodyResult;
        }
        
        const location = state.createLocation(startPos);
        return {
            success: true,
            value: {
                type: 'LoopStatement',
                body: bodyResult.value,
                label,
                location
            },
            state
        };
    };
}

// break 语句解析器
export function parseBreakStatement(): Parser<BreakStatement> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        const breakResult = keyword('break')(state);
        if (!breakResult.success) {
            return breakResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const labelResult = optional(parseNamepath())(state);
        
        skipWhitespaceAndComments()(state);
        optional(matchString(';'))(state);
        
        const location = state.createLocation(startPos);
        return {
            success: true,
            value: {
                type: 'BreakStatement',
                label: labelResult.value,
                location
            },
            state
        };
    };
}

// continue 语句解析器
export function parseContinueStatement(): Parser<ContinueStatement> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        const continueResult = keyword('continue')(state);
        if (!continueResult.success) {
            return continueResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const labelResult = optional(parseNamepath())(state);
        
        skipWhitespaceAndComments()(state);
        optional(matchString(';'))(state);
        
        const location = state.createLocation(startPos);
        return {
            success: true,
            value: {
                type: 'ContinueStatement',
                label: labelResult.value,
                location
            },
            state
        };
    };
}

// return 语句解析器
export function parseReturnStatement(): Parser<ReturnStatement> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        const returnResult = keyword('return')(state);
        if (!returnResult.success) {
            return returnResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const argumentResult = optional(parseExpression())(state);
        
        skipWhitespaceAndComments()(state);
        optional(matchString(';'))(state);
        
        const location = state.createLocation(startPos);
        return {
            success: true,
            value: {
                type: 'ReturnStatement',
                argument: argumentResult.value,
                location
            },
            state
        };
    };
}

// try 语句解析器
export function parseTryStatement(): Parser<TryStatement> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        const tryResult = keyword('try')(state);
        if (!tryResult.success) {
            return tryResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const blockResult = parseBlockStatement()(state);
        if (!blockResult.success) {
            return blockResult;
        }
        
        skipWhitespaceAndComments()(state);
        const handlerResult = optional(parseHandlerStatement())(state);
        
        const location = state.createLocation(startPos);
        return {
            success: true,
            value: {
                type: 'TryStatement',
                block: blockResult.value,
                handler: handlerResult.value,
                location
            },
            state
        };
    };
}

// handler 语句解析器
export function parseHandlerStatement(): Parser<HandlerStatement> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        const handlerResult = keyword('handler')(state);
        if (!handlerResult.success) {
            return handlerResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const labelResult = optional(sequence(keyword('label'), parseNamepath()))(state);
        const label = labelResult.value ? labelResult.value[1] : undefined;
        
        skipWhitespaceAndComments()(state);
        const openResult = matchString('{')(state);
        if (!openResult.success) {
            return openResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const casesResult = many((state: ParseState) => {
            skipWhitespaceAndComments()(state);
            
            // 检查是否是 with 语句
            const withResult = optional(sequence(keyword('with'), parseExpression(), matchString(';')))(state);
            if (withResult.value) {
                return {
                    success: true,
                    value: {
                        type: 'with',
                        handler: withResult.value[1]
                    },
                    state
                };
            }
            
            // 检查是否是 case 语句
            const caseResult = optional(keyword('case'))(state);
            if (caseResult.value) {
                skipWhitespaceAndComments()(state);
                const patternResult = parsePattern()(state);
                if (!patternResult.success) {
                    return patternResult;
                }
                
                skipWhitespaceAndComments()(state);
                const colonResult = matchString(':')(state);
                if (!colonResult.success) {
                    return colonResult as any;
                }
                
                skipWhitespaceAndComments()(state);
                const bodyResult = many(parseStatement())(state);
                if (!bodyResult.success) {
                    return bodyResult;
                }
                
                return {
                    success: true,
                    value: {
                        type: 'case',
                        pattern: patternResult.value,
                        body: bodyResult.value
                    },
                    state
                };
            }
            
            // 检查是否是 else 语句
            const elseResult = optional(keyword('else'))(state);
            if (elseResult.value) {
                skipWhitespaceAndComments()(state);
                const colonResult = matchString(':')(state);
                if (!colonResult.success) {
                    return colonResult as any;
                }
                
                skipWhitespaceAndComments()(state);
                const bodyResult = many(parseStatement())(state);
                if (!bodyResult.success) {
                    return bodyResult;
                }
                
                return {
                    success: true,
                    value: {
                        type: 'else',
                        body: bodyResult.value
                    },
                    state
                };
            }
            
            return {
                success: false,
                errors: ['Expected with, case, or else in handler'],
                state
            };
        })(state);
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
                type: 'HandlerStatement',
                label,
                cases: casesResult.value,
                location
            },
            state
        };
    };
}

// raise 语句解析器
export function parseRaiseStatement(): Parser<RaiseStatement> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        const raiseResult = keyword('raise')(state);
        if (!raiseResult.success) {
            return raiseResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const argumentResult = parseExpression()(state);
        if (!argumentResult.success) {
            return argumentResult;
        }
        
        skipWhitespaceAndComments()(state);
        optional(matchString(';'))(state);
        
        const location = state.createLocation(startPos);
        return {
            success: true,
            value: {
                type: 'RaiseStatement',
                argument: argumentResult.value,
                location
            },
            state
        };
    };
}

// 命名空间声明解析器
export function parseNamespaceDeclaration(): Parser<NamespaceDeclaration> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        const namespaceResult = keyword('namespace')(state);
        if (!namespaceResult.success) {
            return namespaceResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const sharedResult = optional(matchString('!'))(state);
        const shared = sharedResult.value !== null;
        
        skipWhitespaceAndComments()(state);
        const nameResult = sepBy(parseIdentifier(), matchString('.'))(state);
        if (!nameResult.success || nameResult.value.length === 0) {
            return nameResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        optional(matchString(';'))(state);
        
        const location = state.createLocation(startPos);
        return {
            success: true,
            value: {
                type: 'NamespaceDeclaration',
                name: nameResult.value,
                shared,
                location
            },
            state
        };
    };
}

// 导入说明符解析器
function parseImportSpecifier(): Parser<ImportSpecifier> {
    return (state: ParseState) => {
        skipWhitespaceAndComments()(state);
        
        const importedResult = parseIdentifier()(state);
        if (!importedResult.success) {
            return importedResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const asResult = optional(sequence(keyword('as'), parseIdentifier()))(state);
        const local = asResult.value ? asResult.value[1] : importedResult.value;
        
        return {
            success: true,
            value: {
                imported: importedResult.value,
                local
            },
            state
        };
    };
}

// 导入声明解析器
export function parseImportDeclaration(): Parser<ImportDeclaration> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        // 检查是否是 JS 导入
        const jsImportResult = optional(sequence(
            matchString('@.js('),
            parseExpression(), // module
            matchString(','),
            parseExpression(), // name
            optional(sequence(matchString(','), keyword('async'), matchString(':'), keyword('true'))),
            matchString(')')
        ))(state);
        
        if (jsImportResult.value) {
            skipWhitespaceAndComments()(state);
            const usingResult = keyword('using')(state);
            if (!usingResult.success) {
                return usingResult as any;
            }
            
            skipWhitespaceAndComments()(state);
            const localResult = parseIdentifier()(state);
            if (!localResult.success) {
                return localResult as any;
            }
            
            const location = state.createLocation(startPos);
            return {
                success: true,
                value: {
                    type: 'ImportDeclaration',
                    specifiers: [{
                        imported: localResult.value,
                        local: localResult.value
                    }],
                    source: jsImportResult.value[1],
                    isJsImport: true,
                    async: jsImportResult.value[4] !== null,
                    location
                },
                state
            };
        }
        
        // 普通导入
        const usingResult = keyword('using')(state);
        if (!usingResult.success) {
            return usingResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        
        // 解析导入说明符
        const specifiersResult = choice(
            // using {a, b as c, d.{...}}
            map(sequence(
                matchString('{'),
                sepBy(choice(
                    parseImportSpecifier(),
                    // 嵌套导入 d.{...}
                    map(sequence(
                        parseIdentifier(),
                        matchString('.'),
                        matchString('{'),
                        sepBy(parseImportSpecifier(), matchString(',')),
                        matchString('}')
                    ), ([name, , , specs]) => ({ nested: name, specifiers: specs }))
                ), matchString(',')),
                matchString('}')
            ), ([, specs]) => specs),
            // using a as b
            map(parseImportSpecifier(), (spec) => [spec]),
            // using a
            map(parseIdentifier(), (name) => [{ imported: name, local: name }])
        )(state);
        if (!specifiersResult.success) {
            return specifiersResult;
        }
        
        skipWhitespaceAndComments()(state);
        optional(matchString(';'))(state);
        
        const location = state.createLocation(startPos);
        return {
            success: true,
            value: {
                type: 'ImportDeclaration',
                specifiers: specifiersResult.value,
                source: null,
                isJsImport: false,
                async: false,
                location
            },
            state
        };
    };
}

// 宏声明解析器
export function parseMacroDeclaration(): Parser<MacroDeclaration> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        const macroResult = keyword('macro')(state);
        if (!macroResult.success) {
            return macroResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const nameResult = parseNamepath()(state);
        if (!nameResult.success) {
            return nameResult;
        }
        
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
                type: 'MacroDeclaration',
                id: nameResult.value,
                params: paramsResult.value,
                body: bodyResult.value,
                returnType,
                location
            },
            state
        };
    };
}

// 类型声明解析器
export function parseTypeDeclaration(): Parser<TypeDeclaration> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        const typeResult = keyword('type')(state);
        if (!typeResult.success) {
            return typeResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const idResult = parseNamepath()(state);
        if (!idResult.success) {
            return idResult;
        }
        
        skipWhitespaceAndComments()(state);
        const typeParamsResult = optional(sequence(
            matchString('('),
            sepBy(parseTypeParameter(), matchString(',')),
            matchString(')')
        ))(state);
        const typeParameters = typeParamsResult.value ? typeParamsResult.value[1] : undefined;
        
        skipWhitespaceAndComments()(state);
        const colonResult = matchString(':')(state);
        if (!colonResult.success) {
            return colonResult as any;
        }
        
        skipWhitespaceAndComments()(state);
        const typeAnnotationResult = parseTypeAnnotation()(state);
        if (!typeAnnotationResult.success) {
            return typeAnnotationResult;
        }
        
        skipWhitespaceAndComments()(state);
        const bodyResult = parseBlockStatement()(state);
        if (!bodyResult.success) {
            return bodyResult;
        }
        
        skipWhitespaceAndComments()(state);
        optional(matchString(';'))(state);
        
        const location = state.createLocation(startPos);
        return {
            success: true,
            value: {
                type: 'TypeDeclaration',
                id: idResult.value,
                typeParameters,
                typeAnnotation: typeAnnotationResult.value,
                body: bodyResult.value,
                location
            },
            state
        };
    };
}

// 主语句解析器
export function parseStatement(): Parser<Statement> {
    return choice(
        parseNamespaceDeclaration(),
        parseImportDeclaration(),
        parseVariableDeclaration(),
        parseFunctionDeclaration(),
        parseClassDeclaration(),
        parseUnionDeclaration(),
        parseTraitDeclaration(),
        parseImplDeclaration(),
        parseIfStatement(),
        parseMatchStatement(),
        parseLoopStatement(),
        parseBreakStatement(),
        parseContinueStatement(),
        parseReturnStatement(),
        parseTryStatement(),
        parseRaiseStatement(),
        parseMacroDeclaration(),
        parseTypeDeclaration(),
        parseBlockStatement(),
        parseExpressionStatement()
    );
}