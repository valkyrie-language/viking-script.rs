import {choice, number as numberParser, Parser, ParseState} from '../../helper';
import {createNumberLiteral, Literal, NumberLiteral} from 'viking-hir';
import {parseStringLiteral} from "./parseStringLiteral";

export * from "./parseStringLiteral";
export * from "./parseIdentifier";


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
        parseStringLiteral,
        parseBooleanLiteral(),
        parseNullLiteral(),
    );
}