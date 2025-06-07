// 数字字面量解析器
import {number as numberParser, ParseResult, ParseState} from "@helper";
import {NumberLiteral} from "viking-hir";

export function parseNumberLiteral(state: ParseState): ParseResult<NumberLiteral> {
    const startPos = state.position;
    const result = numberParser()(state);
    if (!result.success) {
        return result;
    }

    const location = state.createLocation(startPos);
    return {
        success: true,
        value: {
            type: 'NumberLiteral',
            value: result.value,
            raw: result.value.toString(),
            location
        },
        state
    };
}