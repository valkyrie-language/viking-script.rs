import {Location, ParseError, Position} from 'viking-hir';
import {parse} from 'viking-parser';
import {CodeGenerator} from './generator/index.ts';
import {SourceMapGenerator} from "source-map";

export interface CompileOptions {
    filename?: string;
    sourceMap?: boolean;
    optimize?: boolean;
    strict?: boolean;
    target?: 'es2020';
    typeCheck?: boolean;
    runtimePath?: string;
    emitTokens?: boolean;
    emitAST?: boolean;
    emitCPS?: boolean;
}

export interface CompileResult {
    success: boolean;
    code?: string;
    map?: SourceMapGenerator;
    errors: ParseError[];
}

export function compile(source: string, options?: CompileOptions): CompileResult {
    const parseResult = parse(source);

    if (parseResult.errors.length > 0) {
        return {
            success: false,
            errors: parseResult.errors
        };
    }

    const ast = parseResult.ast;

    if (!ast) {
        return {
            success: false,
            errors: [new ParseError('Failed to parse source into AST', new Location(new Position(1, 1), new Position(1, 1)))]
        };
    }

    // TODO: Implement other compilation stages (type checking, CPS transformation)

    const generator = new CodeGenerator();
    const {code, map} = generator.generate(ast);

    return {
        success: true,
        code,
        map: options?.sourceMap ? map : undefined,
        errors: []
    };
}