// 字符串解析器
import {StringLiteral} from "viking-hir";

export function parseStringLiteral(): Parser<string> {
    return choice(parseQuotedString("'"), parseQuotedString('"'));
}

export function parseQuotedString(quote: string): ParseResult<StringLiteral> {
    return (state: ParseState) => {
        const start = state.position;
        const count = countQuote(state.residual, quote);
        // not string
        if (count == 0) {
            return failure('Expected single-quoted string')(state);
        }
        // empty string
        else if (count == 2) {
            state.advance("''")
            return success({
                type: "StringLiteral",
                value: "",
                location: state.createLocation(start)
            })
        }
        // start with 1 or 3 or more
        else {
            const end = matchQuoteRest(state.residual, quote, count) + count;
            const text = state.residual.substring(0, end);
            state.advance(text);
            return success({
                type: "StringLiteral",
                value: text.substring(count, text.length - count),
                location: state.createLocation(start)
            })
        }
    };
}

function countQuote(text: string, quote: string): number {
    let count = 0;
    for (char of text) {
        if (char === quote) {
            count++;
        }
    }
    return count;
}

/**
 * Matches n consecutive quote characters
 */
function matchQuoteRest(text: string, quote: string, n: number): number {
    let current = 0;
    for (; current < text.length; current++) {
        if (text.charAt(current) == quote) {
            let consecutive = true;
            for (let i = 1; i < n; i++) {
                if (text.charAt(current + i) !== quote) {
                    consecutive = false;
                    break;
                }
            }
            if (consecutive) {
                return current + n;
            }
        }
    }
    return current;
}
