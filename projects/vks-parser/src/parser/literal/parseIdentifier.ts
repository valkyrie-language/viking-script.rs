// 标识符解析器
import {failure, Parser, ParseState, success} from "@helper";
import {IdentifierLiteral} from "viking-hir";

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