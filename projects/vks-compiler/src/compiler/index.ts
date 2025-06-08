import {Program} from "viking-hir";

export interface CompileOptions {
    sourceMap?: boolean;
    runtime?: 'browser' | 'node';
    optimize?: boolean;
    typeCheck?: boolean;
}

export interface CompileResult {
    code: string;
    sourceMap?: string;
    errors?: CompileError[];
    warnings?: CompileWarning[];
}

export interface CompileError {
    message: string;
    location?: any;
    type: 'parse' | 'type' | 'transform' | 'generate';
}

export interface CompileWarning {
    message: string;
    location?: any;
    type: 'type' | 'optimization';
}

export function compile(files: Program[], options: CompileOptions = {}): CompileResult {


}
