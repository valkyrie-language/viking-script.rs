// 数字字面量解析器
import {number as numberParser, Parser, ParseState} from "@helper";
import {createNumberLiteral, NumberLiteral} from "viking-hir";

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