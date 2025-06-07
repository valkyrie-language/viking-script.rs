import {Position} from 'viking-hir';

// 解析结果类型
export interface ParseResult<T> {
    success: boolean;
    value?: T;
    position: Position;
    errors: ParseError[];
}

// 解析器类型
export type Parser<T> = (input: string, position: Position) => ParseResult<T>;

// 解析器状态
export class ParseState {
    input: string;
    position: Position;
    errors: ParseError[];

    constructor(input: string, position: Position) {
        this.input = input;
        this.position = position;
        this.errors = [];
    }

    advance(text: string): void {
        for (const char of text) {
            this.position.offset++;
            if (char == '\n') {
                this.position.column = 1;
                this.position.line++;
            }
                // '\r' ignored here
            // '\t' only count as 1 column
            else {
                this.position.column++;
            }
        }
    }

    // todo: matchString
    // todo: matchRegex
}

// 成功结果
export function success<T>(value: T, position: Position): ParseResult<T> {
    return {
        success: true,
        value,
        position,
        errors: []
    };
}

// 失败结果
export function failure<T>(position: Position, error: ParseError): ParseResult<T> {
    return {
        success: false,
        position,
        errors: [error]
    };
}

// 合并错误
export function mergeErrors<T>(results: ParseResult<T>[]): ParseError[] {
    const errors: ParseError[] = [];
    for (const result of results) {
        errors.push(...result.errors);
    }
    return errors;
}

// 基础解析器组合子

// 匹配字符串
export function matchString(s: string): Parser<string> {
    // todo
}

// 匹配正则表达式
export function matchRegex(regex: RegExp): Parser<string> {
    // todo
}

// 序列组合子
export function sequence<T>(...parsers: any[]): Parser<T> {
    // todo: 限制 any[] 的类型
}

// 选择组合子
export function choice<T>(...parsers: Parser<T>[]): Parser<T> {
    return (input: string, position: Position) => {
        const errors: ParseError[] = [];

        for (const parser of parsers) {
            const result = parser(input, position);
            if (result.success) {
                return result;
            }
            errors.push(...result.errors);
        }

        return {success: false, position, errors};
    };
}

// 可选组合子
export function optional<T>(parser: Parser<T>): Parser<T | null> {
    return (input: string, position: Position) => {
        const result = parser(input, position);
        if (result.success) {
            return result;
        }
        return success(null, position);
    };
}

// 重复组合子, 包括 many 和 many1
export function repeats<T>(parser: Parser<T>, min: number = 0, max: number = 1048576): Parser<T[]> {
    // todo
}

// 重复 0 次或多次
export function many<T>(parser: Parser<T>): Parser<T[]> {
    return repeats(parser, 0);
}

// 重复至少一次
export function many1<T>(parser: Parser<T>): Parser<T[]> {
    return repeats(parser, 1);
}

// 映射组合子
export function map<T, U>(parser: Parser<T>, fn: (value: T) => U): Parser<U> {
    // todo
}

// 分隔符组合子, 例如  [a, b, c,] = [ sepBy(id, ',') ], trailing commas are generally allowed
export function sepBy<T, S>(parser: Parser<T>, separator: Parser<S>): Parser<T[]> {
    // todo
}

// 跳过空白字符
export function skipWhitespace(input: string, position: Position): Position {
    // todo
}

// 跳过注释和空白
export function skipIgnored(input: string, position: Position): Position {
    // todo
}

// 带空白跳过的解析器包装
export function withIgnore<T>(parser: Parser<T>): Parser<T> {
    return (input: string, position: Position) => {
        const newPosition = skipIgnored(input, position);
        const result = parser(input, newPosition);
        if (result.success) {
            const finalPosition = skipIgnored(input, result.position);
            return success(result.value!, finalPosition);
        }
        return result;
    };
}

// 关键字解析器
export function keyword(word: string): Parser<string> {
    return withIgnore(map(
        sequence(
            matchString(word),
            choice(
                matchRegex(/^(?![a-zA-Z0-9_])/),
                map(matchRegex(/^$/), () => '')
            )
        ),
        ([matched]) => matched
    ));
}

// 标识符解析器
export function identifier(): Parser<string> {
    return withIgnore(matchRegex(/^[a-zA-Z_][a-zA-Z0-9_]*/, 'identifier'));
}

// 数字解析器
export function number(): Parser<number> {
    return withIgnore(map(
        matchRegex(/^-?\d+(\.\d+)?([eE][+-]?\d+)?/, 'number'),
        (str) => parseFloat(str)
    ));
}

// 字符串解析器
export function stringLiteral(): Parser<string> {
    return withIgnore(choice(
        // 双引号字符串
        map(
            sequence(
                matchString('"'),
                matchRegex(/^([^"\\]|\\.)*/, 'string content'),
                matchString('"')
            ),
            ([, content]) => content.replace(/\\(.)/g, (_, char) => {
                switch (char) {
                    case 'n':
                        return '\n';
                    case 't':
                        return '\t';
                    case 'r':
                        return '\r';
                    case '\\':
                        return '\\';
                    case '"':
                        return '"';
                    default:
                        return char;
                }
            })
        ),
        // 单引号字符串
        map(
            sequence(
                matchString("'"),
                matchRegex(/^([^'\\]|\\.)*/, 'string content'),
                matchString("'")
            ),
            ([, content]) => content.replace(/\\(.)/g, (_, char) => {
                switch (char) {
                    case 'n':
                        return '\n';
                    case 't':
                        return '\t';
                    case 'r':
                        return '\r';
                    case '\\':
                        return '\\';
                    case "'":
                        return "'";
                    default:
                        return char;
                }
            })
        )
    ));
}

// 布尔值解析器
export function boolean(): Parser<boolean> {
    return choice(
        map(keyword('true'), () => true),
        map(keyword('false'), () => false)
    );
}

// 操作符解析器
export function operator(op: string): Parser<string> {
    return matchString(op);
}

// 符号解析器
export function symbol(sym: string): Parser<string> {
    return matchString(sym);
}