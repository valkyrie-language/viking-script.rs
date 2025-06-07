export * from "./parseStringLiteral";
import {choice, failure, matchString, number as numberParser, Parser, ParseState, success} from '../../helper';
import {
    BooleanLiteral,
    createBooleanLiteral,
    createNullLiteral,
    createNumberLiteral,
    IdentifierLiteral,
    Literal,
    NullLiteral,
    NumberLiteral
} from 'viking-hir';
import {parseStringLiteral} from "./parseStringLiteral";

// null 字面量解析器
export function parseNullLiteral(state: ParseState): Parser<NullLiteral> {
    return (state: ParseState) => {
        const result = parseIdentifier(state);
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

// 布尔字面量解析器
export function parseBooleanLiteral(): Parser<BooleanLiteral> {
    return (state: ParseState) => {
        const startPos = state.position;
        const trueResult = matchString('true')(state);
        if (trueResult.success) {
            const location = state.createLocation(startPos);
            return {
                success: true,
                value: createBooleanLiteral(true, location),
                state
            };
        }

        const falseResult = matchString('false')(state);
        if (falseResult.success) {
            const location = state.createLocation(startPos);
            return {
                success: true,
                value: createBooleanLiteral(false, location),
                state
            };
        }

        return {
            success: false,
            errors: state.errors,
            state
        };
    };
}

// 标识符解析器
export function parseIdentifier(state: ParseState): Parser<IdentifierLiteral> {
    const start = state.position;
    const regex = /^(?:_|\p{XID_Start})(?:\p{XID_Continue}*)/u;
    const matchResult = state.residual.match(regex);
    if (matchResult) {
        const text = matchResult[0];
        state.advance(text)
        const location = state.createLocation(start);
        return success(state, {
            type: "IdentifierLiteral",
            value: text,
            location
        })
    } else {
        return failure(state, `except \`identifier\``, start);
    }
}

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

// 通用字面量解析器
export function parseLiteral(): Parser<Literal> {
    return choice(
        parseNumberLiteral(),
        parseStringLiteral(),
        parseBooleanLiteral(),
        parseNullLiteral(),
    );
}