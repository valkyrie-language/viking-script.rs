// CPS 变换后的节点类型
export interface CPSNode {
    type: CPSType;
}

export type CPSType =
    | 'CPSFunction'
    | 'CPSCall'
    | 'CPSLiteral'
    | 'CPSVariable'
    | 'CPSLambda'
    | 'CPSConditional'
    | 'CPSSequence'
    | 'CPSEffect';

export interface CPSFunction {
    type: 'CPSFunction';
    name?: string;
    params: string[];
    body: CPSExpression;
    location?: any;
}

export interface CPSExpression {
    type: string;
}

export interface CPSCall {
    type: 'CPSCall';
    function: string;
    args: CPSExpression[];
    continuation: CPSExpression;
}

export interface CPSLiteral {
    type: 'CPSLiteral';
    valueType: 'number' | 'string' | 'boolean' | 'null' | 'undefined';
    value: any;
}

export interface CPSVariable {
    type: 'CPSVariable';
    name: string;
}

export interface CPSLambda {
    type: 'CPSLambda';
    params: string[];
    body: CPSExpression;
}

export interface CPSConditional {
    type: 'CPSConditional';
    condition: CPSExpression;
    thenBranch: CPSExpression;
    elseBranch: CPSExpression;
}

export interface CPSSequence {
    type: 'CPSSequence';
    expressions: CPSExpression[];
}

export interface CPSEffect {
    type: 'CPSEffect';
    name: string;
    args: CPSExpression[];
    continuation: CPSExpression;
}

export class CPSTransformer {
    private nextVarId = 0;
    private nextLabelId = 0;
    private currentHandlers: string[] = [];
    
    /**
     * 生成唯一的临时变量名
     */
    private freshVar(prefix = 'tmp'): string {
        return `${prefix}_${this.nextVarId++}`;
    }
    
    /**
     * 生成唯一的标签名
     */
    private freshLabel(prefix = 'label'): string {
        return `${prefix}_${this.nextLabelId++}`;
    }
    
    /**
     * 转换整个程序
     */
    transform(program: any): any {
        const transformedBody = this.transformStatements(program.body);
        
        return {
            ...program,
            body: [
                // 导入运行时
                this.createImportStatement(),
                // 转换后的主体
                ...transformedBody,
                // 导出主函数
                this.createMainExport(transformedBody)
            ],
            meta: {
                ...program.meta,
                cpsTransformed: true
            }
        };
    }
    
    /**
     * 创建运行时导入语句
     */
    private createImportStatement(): any {
        return {
            type: 'ExpressionStatement',
            expression: {
                type: 'CallExpression',
                callee: {
                    type: 'IdentifierLiteral',
                    name: 'require'
                },
                arguments: [{
                    type: 'StringLiteral',
                    value: 'vks-runtime'
                }]
            }
        };
    }
    
    /**
     * 创建主函数导出
     */
    private createMainExport(statements: any[]): any {
        const mainFunction = {
            type: 'FunctionExpression',
            params: [
                { type: 'IdentifierLiteral', name: 'value' },
                { type: 'IdentifierLiteral', name: 'k' },
                { type: 'IdentifierLiteral', name: 'h' }
            ],
            body: {
                type: 'BlockStatement',
                body: statements
            },
            async: false,
            generator: false
        };
        
        return {
            type: 'ExpressionStatement',
            expression: {
                type: 'AssignmentExpression',
                operator: '=',
                left: {
                    type: 'MemberExpression',
                    object: { type: 'IdentifierLiteral', name: 'module' },
                    property: { type: 'IdentifierLiteral', name: 'exports' },
                    computed: false
                },
                right: mainFunction
            }
        };
    }
    
    /**
     * 转换语句列表
     */
    private transformStatements(statements: any[]): any[] {
        const result: any[] = [];
        
        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i];
            const isLast = i === statements.length - 1;
            
            if (isLast) {
                // 最后一个语句需要调用continuation
                result.push(...this.transformStatementWithContinuation(stmt, 'k'));
            } else {
                // 中间语句使用内联continuation
                const nextStmts = statements.slice(i + 1);
                const contVar = this.freshVar('cont');
                
                result.push(...this.transformStatementWithContinuation(stmt, contVar));
                
                // 创建continuation函数
                const contFunction = {
                    type: 'FunctionExpression',
                    params: [
                        { type: 'IdentifierLiteral', name: 'value' },
                        { type: 'IdentifierLiteral', name: 'h' }
                    ],
                    body: {
                        type: 'BlockStatement',
                        body: this.transformStatements(nextStmts)
                    },
                    async: false,
                    generator: false
                };
                
                result.push({
                    type: 'VariableDeclaration',
                    kind: 'const',
                    declarations: [{
                        id: { type: 'IdentifierLiteral', name: contVar },
                        init: contFunction
                    }]
                });
                
                break; // 剩余语句已经在continuation中处理
            }
        }
        
        return result;
    }
    
    /**
     * 转换单个语句并指定continuation
     */
    private transformStatementWithContinuation(stmt: any, contName: string): any[] {
        switch (stmt.type) {
            case 'ExpressionStatement':
                return this.transformExpressionStatement(stmt, contName);
            case 'VariableDeclaration':
                return this.transformVariableDeclaration(stmt, contName);
            case 'FunctionDeclaration':
                return this.transformFunctionDeclaration(stmt, contName);
            case 'IfStatement':
                return this.transformIfStatement(stmt, contName);
            case 'ReturnStatement':
                return this.transformReturnStatement(stmt, contName);
            case 'RaiseStatement':
                return this.transformRaiseStatement(stmt, contName);
            case 'BlockStatement':
                return this.transformBlockStatement(stmt, contName);
            default:
                // 其他语句类型暂时直接返回
                return [stmt];
        }
    }
    
    /**
     * 转换表达式语句
     */
    private transformExpressionStatement(stmt: any, contName: string): any[] {
        const resultVar = this.freshVar('result');
        return this.transformExpression(stmt.expression, resultVar, contName);
    }
    
    /**
     * 转换变量声明
     */
    private transformVariableDeclaration(stmt: any, contName: string): any[] {
        const result: any[] = [];
        
        for (const decl of stmt.declarations) {
            if (decl.init) {
                const initVar = this.freshVar('init');
                const transformedInit = this.transformExpression(decl.init, initVar, contName);
                
                result.push(...transformedInit);
                
                // 创建赋值
                result.push({
                    type: 'ExpressionStatement',
                    expression: {
                        type: 'AssignmentExpression',
                        operator: '=',
                        left: decl.id,
                        right: { type: 'IdentifierLiteral', name: initVar }
                    }
                });
            } else {
                // 无初始值的声明
                result.push({
                    type: 'VariableDeclaration',
                    kind: stmt.kind,
                    declarations: [{
                        id: decl.id,
                        init: { type: 'UndefinedLiteral' }
                    }]
                });
            }
        }
        
        return result;
    }
    
    /**
     * 转换函数声明
     */
    private transformFunctionDeclaration(stmt: any, contName: string): any[] {
        const cpsFunction = {
            type: 'FunctionExpression',
            params: [
                ...stmt.params,
                { type: 'IdentifierLiteral', name: 'k' },
                { type: 'IdentifierLiteral', name: 'h' }
            ],
            body: {
                type: 'BlockStatement',
                body: this.transformStatements(stmt.body.body)
            },
            async: stmt.async,
            generator: stmt.generator
        };
        
        return [{
            type: 'VariableDeclaration',
            kind: 'const',
            declarations: [{
                id: stmt.id,
                init: cpsFunction
            }]
        }];
    }
    
    /**
     * 转换if语句
     */
    private transformIfStatement(stmt: any, contName: string): any[] {
        const testVar = this.freshVar('test');
        const transformedTest = this.transformExpression(stmt.test, testVar, contName);
        
        const consequentStmts = this.transformStatements([stmt.consequent]);
        const alternateStmts = stmt.alternate ? this.transformStatements([stmt.alternate]) : [];
        
        const conditionalExpr = {
            type: 'ConditionalExpression',
            test: { type: 'IdentifierLiteral', name: testVar },
            consequent: {
                type: 'CallExpression',
                callee: {
                    type: 'FunctionExpression',
                    params: [],
                    body: {
                        type: 'BlockStatement',
                        body: consequentStmts
                    },
                    async: false,
                    generator: false
                },
                arguments: []
            },
            alternate: {
                type: 'CallExpression',
                callee: {
                    type: 'FunctionExpression',
                    params: [],
                    body: {
                        type: 'BlockStatement',
                        body: alternateStmts
                    },
                    async: false,
                    generator: false
                },
                arguments: []
            }
        };
        
        return [
            ...transformedTest,
            {
                type: 'ExpressionStatement',
                expression: conditionalExpr
            }
        ];
    }
    
    /**
     * 转换raise语句（代数效应）
     */
    private transformRaiseStatement(stmt: any, contName: string): any[] {
        const effectVar = this.freshVar('effect');
        const transformedEffect = this.transformExpression(stmt.effect, effectVar, contName);
        
        const raiseCall = {
            type: 'CallExpression',
            callee: {
                type: 'MemberExpression',
                object: { type: 'IdentifierLiteral', name: 'VM' },
                property: { type: 'IdentifierLiteral', name: 'raise' },
                computed: false
            },
            arguments: [
                { type: 'IdentifierLiteral', name: effectVar },
                { type: 'IdentifierLiteral', name: contName },
                { type: 'IdentifierLiteral', name: 'h' }
            ]
        };
        
        return [
            ...transformedEffect,
            {
                type: 'ReturnStatement',
                argument: raiseCall
            }
        ];
    }
    
    /**
     * 转换表达式
     */
    private transformExpression(expr: any, resultVar: string, contName: string): any[] {
        switch (expr.type) {
            case 'BinaryExpression':
                return this.transformBinaryExpression(expr, resultVar, contName);
            case 'CallExpression':
                return this.transformCallExpression(expr, resultVar, contName);
            case 'AssignmentExpression':
                return this.transformAssignmentExpression(expr, resultVar, contName);
            default:
                // 简单表达式直接赋值
                return [{
                    type: 'VariableDeclaration',
                    kind: 'const',
                    declarations: [{
                        id: { type: 'IdentifierLiteral', name: resultVar },
                        init: expr
                    }]
                }];
        }
    }
    
    /**
     * 转换二元表达式
     */
    private transformBinaryExpression(expr: any, resultVar: string, contName: string): any[] {
        const leftVar = this.freshVar('left');
        const rightVar = this.freshVar('right');
        
        const leftStmts = this.transformExpression(expr.left, leftVar, contName);
        const rightStmts = this.transformExpression(expr.right, rightVar, contName);
        
        const binaryCall = {
            type: 'CallExpression',
            callee: {
                type: 'MemberExpression',
                object: { type: 'IdentifierLiteral', name: 'VM' },
                property: { type: 'IdentifierLiteral', name: this.getOperatorMethod(expr.operator) },
                computed: false
            },
            arguments: [
                { type: 'IdentifierLiteral', name: leftVar },
                { type: 'IdentifierLiteral', name: rightVar },
                { type: 'IdentifierLiteral', name: contName },
                { type: 'IdentifierLiteral', name: 'h' }
            ]
        };
        
        return [
            ...leftStmts,
            ...rightStmts,
            {
                type: 'ReturnStatement',
                argument: binaryCall
            }
        ];
    }
    
    /**
     * 转换函数调用表达式
     */
    private transformCallExpression(expr: any, resultVar: string, contName: string): any[] {
        const calleeVar = this.freshVar('callee');
        const argVars = expr.arguments.map(() => this.freshVar('arg'));
        
        const calleeStmts = this.transformExpression(expr.callee, calleeVar, contName);
        const argStmts = expr.arguments.flatMap((arg: any, i: number) => 
            this.transformExpression(arg, argVars[i], contName)
        );
        
        const cpsCall = {
            type: 'CallExpression',
            callee: { type: 'IdentifierLiteral', name: calleeVar },
            arguments: [
                ...argVars.map(name => ({ type: 'IdentifierLiteral', name })),
                { type: 'IdentifierLiteral', name: contName },
                { type: 'IdentifierLiteral', name: 'h' }
            ]
        };
        
        return [
            ...calleeStmts,
            ...argStmts,
            {
                type: 'ReturnStatement',
                argument: cpsCall
            }
        ];
    }
    
    /**
     * 获取操作符对应的VM方法名
     */
    private getOperatorMethod(operator: string): string {
        const operatorMap: { [key: string]: string } = {
            '+': 'add',
            '-': 'subtract',
            '*': 'multiply',
            '/': 'divide',
            '%': 'modulo',
            '==': 'equal',
            '!=': 'notEqual',
            '<': 'lessThan',
            '>': 'greaterThan',
            '<=': 'lessThanOrEqual',
            '>=': 'greaterThanOrEqual',
            '&&': 'logicalAnd',
            '||': 'logicalOr'
        };
        
        return operatorMap[operator] || 'binaryOp';
    }
    
    private transformReturnStatement(stmt: any, contName: string): any[] {
        if (stmt.argument) {
            const argVar = this.freshVar('returnValue');
            const argStmts = this.transformExpression(stmt.argument, argVar, contName);
            
            return [
                ...argStmts,
                {
                    type: 'ReturnStatement',
                    argument: {
                        type: 'CallExpression',
                        callee: { type: 'IdentifierLiteral', name: contName },
                        arguments: [
                            { type: 'IdentifierLiteral', name: argVar },
                            { type: 'IdentifierLiteral', name: 'h' }
                        ]
                    }
                }
            ];
        } else {
            return [{
                type: 'ReturnStatement',
                argument: {
                    type: 'CallExpression',
                    callee: { type: 'IdentifierLiteral', name: contName },
                    arguments: [
                        { type: 'UndefinedLiteral' },
                        { type: 'IdentifierLiteral', name: 'h' }
                    ]
                }
            }];
        }
    }
    
    private transformBlockStatement(stmt: any, contName: string): any[] {
        return this.transformStatements(stmt.body);
    }
    
    private transformAssignmentExpression(expr: any, resultVar: string, contName: string): any[] {
        const rightVar = this.freshVar('right');
        const rightStmts = this.transformExpression(expr.right, rightVar, contName);
        
        return [
            ...rightStmts,
            {
                type: 'ExpressionStatement',
                expression: {
                    type: 'AssignmentExpression',
                    operator: expr.operator,
                    left: expr.left,
                    right: { type: 'IdentifierLiteral', name: rightVar }
                }
            },
            {
                type: 'VariableDeclaration',
                kind: 'const',
                declarations: [{
                    id: { type: 'IdentifierLiteral', name: resultVar },
                    init: { type: 'IdentifierLiteral', name: rightVar }
                }]
            }
        ];
    }
}