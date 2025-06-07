import {choice, failure, map, optional, ParseState, sequence, success} from "@helper"
import {parseIdentifier} from "../index";
import {StringLiteral} from "viking-hir";

export const parseStringLiteral: Parser<StringLiteral> = map(
    sequence(
        optional(parseIdentifier),
        choice(parseQuotedString("'"), parseQuotedString('"'))
    ),
    ([handler, text]) => {
        return {
            type: "StringLiteral",
            handler: handler,
            text: text,
        }
    })

export function parseQuotedString(quote: string): ParseResult<string> {
    return (state: ParseState) => {
        const count = countQuote(state.residual, quote);
        // not string
        if (count == 0) {
            return failure(state, 'Expected single-quoted string');
        }
        // empty string
        else if (count == 2) {
            state.advance("''")
            return success(state, "")
        }
        // start with 1 or 3 or more
        else {
            const rest = state.residual.substring(count, state.residual.length);
            const end = matchQuoteRest(rest, quote, count);
            const text = state.residual.substring(0, end);
            state.advance(text);
            return success(state, text.substring(count, text.length - count + 1))
        }
    };
}

function countQuote(text: string, quote: string): number {
    let count = 0;
    for (const char of text) {
        if (char === quote) {
            count++;
        } else {
            break
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
