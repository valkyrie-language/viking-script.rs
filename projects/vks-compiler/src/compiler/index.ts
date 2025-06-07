import {SourceMapGenerator} from "source-map";
import {Location, ParseError, Position} from "viking-hir";
import {parse} from "viking-parser";
import {CodeGenerator} from "../generator/index.ts";

export interface CompileOptions {
    filename?: string;
    sourceMap?: boolean;
    typeCheck?: boolean;
    runtimePath?: string;
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
    // TODO: add files, regroup classes
    const {code, map} = generator.finish();

    return {
        success: true,
        code,
        map: options?.sourceMap ? map : undefined,
        errors: []
    };
}