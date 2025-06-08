import {Location, Program} from 'viking-hir';

export interface CompileOptions {
    sourceMap?: boolean;
    runtime?: 'browser' | 'node';
    optimize?: boolean;
    typeCheck?: boolean;
    strict?: boolean;
}

export interface CompileResult {
    code: string;
    sourceMap?: string;
    hints?: CompileError[];
}

export interface CompileError {
    level: 'error' | 'warning';
    stage: 'parse' | 'type' | 'transform' | 'generate';
    message: string;
    file?: string;
    location?: Location;
}

/**
 * 编译多个Viking源文件
 * @param inputs 输入文件数组
 * @param options 编译选项
 * @returns 编译结果
 */
export function compile(inputs: Program[], options: CompileOptions = {}): CompileResult {

}
