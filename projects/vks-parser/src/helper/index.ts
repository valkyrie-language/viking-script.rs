import {Location, ParseError, Position, StringLiteral} from 'viking-hir';

// 解析结果类型
export type ParseResult<T> = {
    success: true;
    value: T;
    state: ParseState;
} | {
    success: false;
    errors: ParseError[];
    state: ParseState;
};

// 解析器类型
export type Parser<T> = (state: ParseState) => ParseResult<T>;

// 解析器状态
export class ParseState {
    private readonly input: string;
    position: Position;
    errors: ParseError[];
    file: string;

    constructor(input: string, position?: Position, file?: string) {
        this.input = input;
        this.position = position || new Position(1, 1, 0);
        this.errors = [];
        this.file = file || "<anonymous>";
    }

    get residual(): string {
        return this.input.slice(this.position.offset, this.input.length);
    }

    clone(): ParseState {
        const newState = new ParseState(this.input, this.position, this.file);
        newState.errors = [...this.errors];
        return newState;
    }

    advance(text: string): void {
        for (const char of text) {
            this.position.offset++;
            if (char === '\n') {
                this.position.column = 1;
                this.position.line++;
            } else if (char !== '\r') {
                this.position.column++;
            }
        }
    }

    peek(length: number = 1): string {
        return this.input.slice(this.position.offset, this.position.offset + length);
    }

    notEof(): boolean {
        return this.position.offset < this.input.length;
    }

    addError(message: string, expected?: string[], actual?: string): void {
        this.errors.push(new ParseError(message, this.position, expected, actual));
    }

    createLocation(start: Position): Location {
        return new Location(start, this.position, this.file);
    }
}

// 基础解析器组合子

// 成功解析器
export function success<T>(state: ParseState, value: T): ParseResult<T> {
    return {
        success: true,
        value,
        state
    };
}

// 失败解析器
export function failure<T>(state: ParseState, message: string, position: Position): Parser<T> {
    return {
        success: false,
        errors: [new ParseError(message, position)],
        state
    };
}

// 匹配字符串
export function matchString(str: string): Parser<string> {
    return (state: ParseState) => {
        const text = state.peek(str.length);
        if (text === str) {
            state.advance(str);
            return {
                success: true,
                value: str,
                state
            };
        }
        state.addError(`Expected "${str}"`, [str], text);
        return {
            success: false,
            errors: state.errors,
            state
        };
    };
}

// 匹配正则表达式
export function matchRegex(regex: RegExp, name?: string): Parser<string> {
    return (state: ParseState) => {
        const match = state.residual.match(regex);
        if (match && match.index === 0) {
            const matched = match[0];
            state.advance(matched);
            return {
                success: true,
                value: matched,
                state
            };
        }
        state.addError(`Expected ${name || regex.toString()}`, [name || regex.toString()], state.peek());
        return {
            success: false,
            errors: state.errors,
            state
        };
    };
}

// 序列组合子
export function sequence<T extends readonly unknown[]>(...parsers: { [K in keyof T]: Parser<T[K]> }): Parser<T> {
    return (state: ParseState) => {
        const results: unknown[] = [];
        const startState = state.clone();

        for (const parser of parsers) {
            const result = parser(state);
            if (!result.success) {
                return {
                    success: false,
                    errors: state.errors,
                    state: startState
                };
            }
            results.push(result.value);
        }

        return {
            success: true,
            value: results as T,
            state
        };
    };
}

// 选择组合子
export function choice<T>(...parsers: Parser<T>[]): Parser<T> {
    return (state: ParseState) => {
        const startState = state.clone();
        const allErrors: ParseError[] = [];

        for (const parser of parsers) {
            const testState = startState.clone();
            const result = parser(testState);
            if (result.success) {
                state.position = testState.position;
                return result;
            }
            allErrors.push(...testState.errors);
        }

        state.errors.push(...allErrors);
        return {
            success: false,
            errors: state.errors,
            state: startState
        };
    };
}

// 可选组合子
export function optional<T>(parser: Parser<T>): Parser<T | null> {
    return (state: ParseState) => {
        const startState = state.clone();
        const result = parser(state);
        if (result.success) {
            return result;
        }
        return {
            success: true,
            value: null,
            state: startState
        };
    };
}

// 多次匹配组合子
export function many<T>(parser: Parser<T>): Parser<T[]> {
    return (state: ParseState) => {
        const results: T[] = [];

        while (state.notEof()) {
            const startState = state.clone();
            const result = parser(state);
            if (!result.success) {
                state.position = startState.position;
                break;
            }
            results.push(result.value);
        }

        return {
            success: true,
            value: results,
            state
        };
    };
}

// 至少一次匹配组合子
export function many1<T>(parser: Parser<T>): Parser<T[]> {
    return (state: ParseState) => {
        const result = parser(state);
        if (!result.success) {
            return result;
        }

        const manyResult = many(parser)(state);
        return {
            success: true,
            value: [result.value, ...manyResult.value],
            state
        };
    };
}

// 分隔符组合子
export function sepBy<T, S>(parser: Parser<T>, separator: Parser<S>): Parser<T[]> {
    return (state: ParseState) => {
        const firstResult = parser(state);
        if (!firstResult.success) {
            return {
                success: true,
                value: [],
                state
            };
        }

        const results = [firstResult.value];

        while (state.notEof()) {
            const startState = state.clone();
            const sepResult = separator(state);
            if (!sepResult.success) {
                state.position = startState.position;
                break;
            }

            const itemResult = parser(state);
            if (!itemResult.success) {
                state.position = startState.position;
                break;
            }

            results.push(itemResult.value);
        }

        return {
            success: true,
            value: results,
            state
        };
    };
}

// 映射组合子
export function map<T, U>(parser: Parser<T>, fn: (value: T) => U): Parser<U> {
    return (state: ParseState) => {
        const result = parser(state);
        if (!result.success) {
            return result;
        }
        return {
            success: true,
            value: fn(result.value),
            state
        };
    };
}

// 跳过空白字符
export function skipWhitespace(): Parser<null> {
    return map(matchRegex(/^\s*/, 'whitespace'), () => null);
}

// 跳过注释
export function skipComments(): Parser<null> {
    const singleLineComment = matchRegex(/^#[^\n]*/, 'single line comment');
    const multiLineComment = (state: ParseState): ParseResult<string> => {
        if (!state.peek(2).startsWith('<#')) {
            return failure<string>('Expected multi-line comment')(state);
        }

        let depth = 0;
        let consumed = '';
        let i = state.position.offset;

        while (i < state.input.length) {
            const char = state.input[i];
            const next = state.input[i + 1];

            if (char === '<' && next === '#') {
                depth++;
                consumed += '<#';
                i += 2;
            } else if (char === '#' && next === '>') {
                depth--;
                consumed += '#>';
                i += 2;
                if (depth === 0) {
                    state.advance(consumed);
                    return {
                        success: true,
                        value: consumed,
                        state
                    };
                }
            } else {
                consumed += char;
                i++;
            }
        }

        state.addError('Unterminated multi-line comment');
        return {
            success: false,
            errors: state.errors,
            state
        };
    };

    return map(many(choice(singleLineComment, multiLineComment)), () => null);
}

// 跳过空白和注释
export function skipWhitespaceAndComments(): Parser<null> {
    return map(many(choice(skipWhitespace(), skipComments())), () => null);
}

// 关键字解析器
export function keyword(word: string): Parser<string> {
    return (state: ParseState) => {
        const wordResult = matchString(word)(state);
        if (!wordResult.success) {
            return wordResult;
        }

        // 确保关键字后面不是标识符字符
        const nextChar = state.peek(1);
        if (nextChar && /[a-zA-Z0-9_]/.test(nextChar)) {
            state.addError(`Expected keyword "${word}" but found identifier`);
            return {
                success: false,
                errors: state.errors,
                state
            };
        }

        return wordResult;
    };
}


// 数字解析器
export function number(): Parser<number> {
    return map(
        matchRegex(/^\d+(\.\d+)?([eE][+-]?\d+)?/, 'number'),
        (str) => parseFloat(str)
    );
}



// 错误恢复组合子
export function recover<T>(parser: Parser<T>, recovery: Parser<T>): Parser<T> {
    return (state: ParseState) => {
        const result = parser(state);
        if (result.success) {
            return result;
        }
        return recovery(state);
    };
}

// 同步到特定标记
export function syncTo(tokens: string[]): Parser<null> {
    return (state: ParseState) => {
        while (state.notEof()) {
            for (const token of tokens) {
                if (state.peek(token.length) === token) {
                    return {
                        success: true,
                        value: null,
                        state
                    };
                }
            }
            state.advance(state.peek(1));
        }
        return {
            success: true,
            value: null,
            state
        };
    };
}
