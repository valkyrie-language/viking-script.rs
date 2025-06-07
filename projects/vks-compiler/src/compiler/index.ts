import { ASTNode, Program } from '../../vks-hir/src/nodes';
import { SymbolTable } from './symbol-table';
import { TypeChecker, TypeCheckError } from './type-checker';
import { CPSTransformer, CPSNode } from './transformer';
import { CodeGenerator, GeneratorOptions, GeneratedCode } from './generator';
import { Lexer, LexerError } from '../../vks-parser/src/lexer';
import { Parser, ParseError } from '../../vks-parser/src/parser';

export interface CompilerOptions {
    // 类型检查选项
    skipTypeCheck?: boolean;
    strictMode?: boolean;

    // 代码生成选项
    sourceMap?: boolean;
    sourceFileName?: string;
    outputFileName?: string;
    minify?: boolean;
    runtimePath?: string;

    // CPS 变换选项
    enableCPS?: boolean;
    optimizeTailCalls?: boolean;

    // 调试选项
    debug?: boolean;
    dumpAST?: boolean;
    dumpCPS?: boolean;
    emitTokens?: boolean;
    emitAST?: boolean;
    emitCPS?: boolean;
}

export interface CompilerResult {
    success: boolean;
    code?: string;
    sourceMap?: string;
    errors: CompilerError[];
    warnings: CompilerWarning[];

    // 调试信息
    ast?: ASTNode;
    cpsAst?: CPSNode;
    typeCheckErrors?: TypeCheckError[];
}

export interface CompilerError {
    message: string;
    location?: {
        file: string;
        line: number;
        column: number;
    };
    code: string;
    severity: 'error' | 'warning';
}

export interface CompilerWarning extends CompilerError {
    severity: 'warning';
}

export class Compiler {
    private symbolTable: SymbolTable;
    private typeChecker: TypeChecker;
    private cpsTransformer: CPSTransformer;
    private codeGenerator: CodeGenerator;

    constructor() {
        this.symbolTable = new SymbolTable();
        this.typeChecker = new TypeChecker(this.symbolTable);
        this.cpsTransformer = new CPSTransformer(this.symbolTable);
        this.codeGenerator = new CodeGenerator();
    }

    /**
     * 编译 Viking AST 到 JavaScript
     * @param ast Viking 语言的 AST
     * @param options 编译选项
     * @returns 编译结果
     */
    compile(ast: ASTNode, options: CompilerOptions = {}): CompilerResult {
        const result: CompilerResult = {
            success: false,
            errors: [],
            warnings: []
        };

        try {
            // 验证输入
            if (!ast) {
                result.errors.push({
                    message: 'AST is required',
                    code: 'MISSING_AST',
                    severity: 'error'
                });
                return result;
            }

            if (ast.type !== 'Program') {
                result.errors.push({
                    message: 'Root AST node must be a Program',
                    code: 'INVALID_ROOT_NODE',
                    severity: 'error'
                });
                return result;
            }

            const program = ast as Program;

            // 调试：输出原始 AST
            if (options.debug && options.dumpAST) {
                console.log('Original AST:', JSON.stringify(program, null, 2));
            }

            // 第一阶段：类型检查
            if (!options.skipTypeCheck) {
                console.log('Phase 1: Type checking...');

                const typeCheckResult = this.typeChecker.check(program);
                const typeErrors = this.typeChecker.getErrors();

                result.typeCheckErrors = typeErrors;

                // 转换类型错误为编译错误
                for (const typeError of typeErrors) {
                    result.errors.push({
                        message: typeError.message,
                        location: {
                            file: typeError.location.file,
                            line: typeError.location.start.line,
                            column: typeError.location.start.column
                        },
                        code: typeError.code,
                        severity: 'error'
                    });
                }

                // 如果有类型错误且处于严格模式，停止编译
                if (typeErrors.length > 0 && options.strictMode) {
                    result.success = false;
                    return result;
                }
            }

            // 第二阶段：CPS 变换
            let cpsAst: CPSNode;
            if (options.enableCPS !== false) {
                console.log('Phase 2: CPS transformation...');

                cpsAst = this.cpsTransformer.transform(program);
                result.cpsAst = cpsAst;

                // 调试：输出 CPS AST
                if (options.debug && options.dumpCPS) {
                    console.log('CPS AST:', JSON.stringify(cpsAst, null, 2));
                }
            } else {
                // 如果禁用 CPS，直接使用原始 AST（需要适配）
                cpsAst = program as any;
            }

            // 第三阶段：代码生成
            console.log('Phase 3: Code generation...');

            const generatorOptions: GeneratorOptions = {
                sourceMap: options.sourceMap,
                sourceFileName: options.sourceFileName,
                outputFileName: options.outputFileName,
                minify: options.minify,
                runtimePath: options.runtimePath
            };

            this.codeGenerator = new CodeGenerator(generatorOptions);
            const generated = this.codeGenerator.generate(cpsAst);

            result.code = generated.code;
            result.sourceMap = generated.sourceMap;
            result.success = true;

            console.log('Compilation completed successfully!');

            return result;

        } catch (error) {
            console.error('Compilation failed:', error);

            result.errors.push({
                message: error instanceof Error ? error.message : 'Unknown compilation error',
                code: 'COMPILATION_ERROR',
                severity: 'error'
            });

            result.success = false;
            return result;
        }
    }

    /**
     * 编译 Viking 代码字符串到 JavaScript
     * @param source Viking 源代码
     * @param options 编译选项
     * @returns 编译结果
     */
    compileSource(source: string, options: CompilerOptions = {}): CompilerResult {
        try {
            // 词法分析
            const lexer = new Lexer(source, options.sourceFileName || '<unknown>');
            const tokens = lexer.tokenize();

            if (options.emitTokens) {
                console.log('Tokens:', tokens);
            }

            // 语法分析
            const parser = new Parser(tokens, options.sourceFileName || '<unknown>');
            const ast = parser.parse();

            if (options.emitAST) {
                console.log('AST:', JSON.stringify(ast, null, 2));
            }

            // 编译 AST
            return this.compile(ast, options);
        } catch (error) {
            if (error instanceof LexerError || error instanceof ParseError) {
                return {
                    success: false,
                    errors: [{
                        message: error.message,
                        location: error.location,
                        code: 'PARSE_ERROR',
                        severity: 'error'
                    }],
                    warnings: []
                };
            }
            throw error;
        }
    }

    /**
     * 获取编译器版本信息
     */
    getVersion(): string {
        return '1.0.0';
    }

    /**
     * 获取支持的语言特性
     */
    getSupportedFeatures(): string[] {
        return [
            'variables',
            'functions',
            'classes',
            'unions',
            'traits',
            'pattern-matching',
            'loops',
            'generators',
            'async-await',
            'algebraic-effects',
            'cps-transformation',
            'type-checking',
            'source-maps'
        ];
    }

    /**
     * 重置编译器状态
     */
    reset(): void {
        this.symbolTable = new SymbolTable();
        this.typeChecker = new TypeChecker(this.symbolTable);
        this.cpsTransformer = new CPSTransformer(this.symbolTable);
        this.codeGenerator = new CodeGenerator();
    }

    /**
     * 获取符号表（用于调试）
     */
    getSymbolTable(): SymbolTable {
        return this.symbolTable;
    }

    /**
     * 验证编译选项
     */
    private validateOptions(options: CompilerOptions): CompilerError[] {
        const errors: CompilerError[] = [];

        if (options.sourceMap && !options.sourceFileName) {
            errors.push({
                message: 'sourceFileName is required when sourceMap is enabled',
                code: 'MISSING_SOURCE_FILENAME',
                severity: 'error'
            });
        }

        if (options.sourceMap && !options.outputFileName) {
            errors.push({
                message: 'outputFileName is required when sourceMap is enabled',
                code: 'MISSING_OUTPUT_FILENAME',
                severity: 'error'
            });
        }

        return errors;
    }
}

// 导出默认编译器实例
export const compiler = new Compiler();

// 便捷函数
export function compile(ast: ASTNode, options?: CompilerOptions): CompilerResult {
    return compiler.compile(ast, options);
}

export function compileSource(source: string, options?: CompilerOptions): CompilerResult {
    return compiler.compileSource(source, options);
}