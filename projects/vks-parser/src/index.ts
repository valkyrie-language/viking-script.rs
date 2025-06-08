// 导出解析器组合子和辅助函数
export * from '@helper/index.ts';
export * from '@parser/index.ts';
export type {Program, Position, Location, ParseError} from 'viking-hir';
export {ParseState} from "@helper/parseState.ts";

import {ParseResult, syncTo} from '@helper/index.ts';
import {parseProgram} from '@parser/index.ts';
import {Location, ParseError, Position, Program} from 'viking-hir';
import {ParseState} from "@helper/parseState.ts";

export interface VikingProgram {
    ast: Program | null;
    errors: ParseError[];
}

/**
 * 解析 Viking 语言源代码
 * @param text 源代码文本
 * @param startPosition 起始位置，默认为 (1, 1)
 * @returns 解析结果，包含 AST 和错误信息
 */
export function parse(text: string, startPosition?: Position): VikingProgram {
    const state = new ParseState(text, startPosition);

    try {
        const result = parseProgram()(state);

        if (result.success) {
            return {
                ast: result.value,
                errors: state.errors
            };
        } else {
            // 解析失败，尝试错误恢复
            const recoveredResult = recoverFromError(state, text);
            return {
                ast: recoveredResult.ast,
                errors: [...state.errors, ...recoveredResult.errors]
            };
        }
    } catch (error) {
        // 捕获意外错误
        const parseError = new ParseError(
            `Unexpected error during parsing: ${error instanceof Error ? error.message : String(error)}`,
            state.createLocation(state.position)
        );

        return {
            ast: null,
            errors: [parseError]
        };
    }
}

/**
 * 增量解析 Viking 语言源代码
 * @param text 新的源代码文本
 * @param changedPosition 变更位置
 * @param oldAst 旧的 AST（可选，用于优化）
 * @returns 解析结果，包含 AST 和错误信息
 */
export function parseIncremental(text: string, changedPosition: Position, oldAst?: Program): VikingProgram {
    // 目前实现简单的增量解析策略
    // 在实际应用中，可以根据 changedPosition 和 oldAst 进行更智能的增量解析

    // 如果变更位置在文档开头附近，重新解析整个文档
    if (changedPosition.line <= 10) {
        return parse(text, new Position(1, 1, 0));
    }

    // 尝试从变更位置开始解析
    const state = new ParseState(text, changedPosition);

    try {
        // 首先尝试同步到一个已知的同步点
        const syncResult = syncToStatement(state);
        if (!syncResult.success) {
            // 如果无法同步，回退到完整解析
            return parse(text, new Position(1, 1, 0));
        }

        // 从同步点开始解析
        const result = parseProgram()(state);

        if (result.success) {
            return {
                ast: result.value,
                errors: state.errors
            };
        } else {
            // 增量解析失败，回退到完整解析
            return parse(text, new Position(1, 1, 0));
        }
    } catch (error) {
        // 增量解析出错，回退到完整解析
        return parse(text, new Position(1, 1, 0));
    }
}

/**
 * 错误恢复函数
 * 尝试从解析错误中恢复，构建部分 AST
 */
function recoverFromError(state: ParseState, text: string): {
    ast: Program | null;
    errors: ParseError[];
} {
    const errors: ParseError[] = [];
    const statements: any[] = [];

    // 重置状态到文档开头
    state.position = new Position(1, 1, 0);
    state.errors = [];

    while (state.notEof()) {
        try {
            // 尝试解析单个语句
            const statementResult = parseProgram()(state);

            if (statementResult.success && statementResult.value.body.length > 0) {
                statements.push(...statementResult.value.body);
                break; // 成功解析，退出恢复循环
            } else {
                // 解析失败，尝试同步到下一个语句
                const syncResult = syncToStatement(state);
                if (!syncResult.success) {
                    // 无法同步，跳过当前字符
                    const errorLocation = state.createLocation(state.position);
                    errors.push(new ParseError(
                        `Unexpected character '${state.currentChar()}' at position ${state.position.line}:${state.position.column}`,
                        errorLocation
                    ));
                    state.advance();
                }
            }
        } catch (error) {
            // 捕获解析过程中的错误
            const errorLocation = state.createLocation(state.position);
            errors.push(new ParseError(
                `Error during recovery: ${error instanceof Error ? error.message : String(error)}`,
                errorLocation
            ));

            // 尝试跳过当前字符
            if (state.notEof()) {
                state.advance();
            } else {
                break;
            }
        }
    }

    // 构建部分 AST
    const ast = statements.length > 0 ? {
        type: 'Program' as const,
        body: statements,
        location: new Location(
            new Position(1, 1, 0),
            state.position
        )
    } : null;

    return {
        ast,
        errors: [...state.errors, ...errors]
    };
}

/**
 * 同步到语句边界
 * 寻找可能的语句开始位置
 */
function syncToStatement(state: ParseState): ParseResult<boolean> {
    const syncTokens = [
        'let', 'const', 'var', 'function', 'class', 'union', 'trait', 'impl',
        'if', 'match', 'loop', 'break', 'continue', 'return', 'try', 'raise',
        'namespace', 'using', 'macro', 'type', '{', '}'
    ];

    return syncTo(syncTokens)(state);
}
