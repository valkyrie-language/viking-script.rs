import {parse} from 'viking-parser';
import {Program} from 'viking-hir';
import {TypeChecker} from '../analyzer/type-checker.ts';
import {CPSTransformer} from '../transformer/cps-transformer.ts';
import {CodeOptimizer, GenerateOptions, JavaScriptGenerator} from '../generator/js-generator.ts';

export interface CompileOptions {
    sourceMap?: boolean;
    minify?: boolean;
    target?: 'es5' | 'es2015' | 'es2017' | 'es2020';
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

export function compile(files: { path: string; content: string }[], options: CompileOptions = {}): CompileResult {


}
