// 标识符解析器
import {failure, ParseResult, success} from "@helper";
import {BooleanLiteral, IdentifierLiteral, NullLiteral} from "viking-hir";
import {ParseState} from "@helper/parseState.ts";

export function parseIdentifier(state: ParseState): ParseResult<IdentifierLiteral> {
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
export function parseNullLiteral(state: ParseState): ParseResult<NullLiteral> {
    const id = parseIdentifier(state);
    if (id.success) {
        if (id.value.value == "null") {
            return success(state, {
                type: "NullLiteral",
                location: id.value.location
            })
        }
        return failure(state, `except \`null\``, id.value.location!.start);
    }
    return id;
}

// 布尔字面量解析器
export function parseBooleanLiteral(state: ParseState): ParseResult<BooleanLiteral> {
    const id = parseIdentifier(state);
    if (id.success) {
        if (id.value.value == "true") {
            return success(state, {
                type: "BooleanLiteral",
                value: true,
                location: id.value.location
            })
        }
        if (id.value.value == "false") {
            return success(state, {
                type: "BooleanLiteral",
                value: false,
                location: id.value.location
            })
        }
        return failure(state, `except \`null\``, id.value.location!.start);
    }
    return id;
}