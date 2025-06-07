import {
    Parser,
    ParseState,
    ParseResult,
    map,
    choice,
    keyword,
    number as numberParser,
    stringLiteral as stringParser,
    boolean as booleanParser,
    nullLiteral as nullParser,
    skipWhitespaceAndComments
} from '../helper';
import {
    NumberLiteral,
    StringLiteral,
    BooleanLiteral,
    NullLiteral,
    UndefinedLiteral,
    Literal,
    createNumberLiteral,
    createStringLiteral,
    createBooleanLiteral,
    createNullLiteral
} from 'viking-hir';

// 数字字面量解析器
export function parseNumberLiteral(): Parser<NumberLiteral> {
    return (state: ParseState) => {
        const startPos = state.position;
        const result = numberParser()(state);
        if (!result.success) {
            return result;
        }
        
        const location = state.createLocation(startPos);
        return {
            success: true,
            value: createNumberLiteral(result.value, result.value.toString(), location),
            state
        };
    };
}

// 字符串字面量解析器
export function parseStringLiteral(): Parser<StringLiteral> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        const result = stringParser()(state);
        if (!result.success) {
            return result;
        }
        
        const location = state.createLocation(startPos);
        return {
            success: true,
            value: createStringLiteral(result.value, `"${result.value}"`, location),
            state
        };
    };
}

// 布尔字面量解析器
export function parseBooleanLiteral(): Parser<BooleanLiteral> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        const result = booleanParser()(state);
        if (!result.success) {
            return result;
        }
        
        const location = state.createLocation(startPos);
        return {
            success: true,
            value: createBooleanLiteral(result.value, location),
            state
        };
    };
}

// null 字面量解析器
export function parseNullLiteral(): Parser<NullLiteral> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        const result = nullParser()(state);
        if (!result.success) {
            return result;
        }
        
        const location = state.createLocation(startPos);
        return {
            success: true,
            value: createNullLiteral(location),
            state
        };
    };
}

// undefined 字面量解析器
export function parseUndefinedLiteral(): Parser<UndefinedLiteral> {
    return (state: ParseState) => {
        const startPos = state.position;
        skipWhitespaceAndComments()(state);
        
        const result = keyword('undefined')(state);
        if (!result.success) {
            return result;
        }
        
        const location = state.createLocation(startPos);
        return {
            success: true,
            value: {
                type: 'UndefinedLiteral',
                value: undefined,
                location
            },
            state
        };
    };
}

// 通用字面量解析器
export function parseLiteral(): Parser<Literal> {
    return choice(
        parseNumberLiteral(),
        parseStringLiteral(),
        parseBooleanLiteral(),
        parseNullLiteral(),
        parseUndefinedLiteral()
    );
}