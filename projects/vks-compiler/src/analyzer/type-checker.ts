// Type Checker for Viking Language
import {
    ArrayExpression,
    AssignmentExpression,
    ASTNode,
    BinaryExpression,
    BlockStatement,
    BooleanLiteral,
    CallExpression,
    ClassDeclaration,
    ConditionalExpression,
    Expression,
    ExpressionStatement,
    FunctionDeclaration,
    IdentifierLiteral,
    IfStatement,
    MemberExpression,
    NullLiteral,
    NumberLiteral,
    ObjectExpression,
    Program,
    ReturnStatement,
    Statement,
    StringLiteral,
    UnaryExpression,
    VariableDeclaration
} from 'viking-hir';

// 类型系统定义
export interface VikingType {
    kind: string;

    [key: string]: any;
}

export interface PrimitiveType extends VikingType {
    kind: 'primitive';
    name: 'number' | 'string' | 'boolean' | 'null' | 'undefined' | 'any';
}

export interface FunctionType extends VikingType {
    kind: 'function';
    parameters: VikingType[];
    returnType: VikingType;
    isAsync?: boolean;
    isGenerator?: boolean;
}

export interface ArrayType extends VikingType {
    kind: 'array';
    elementType: VikingType;
}

export interface ObjectType extends VikingType {
    kind: 'object';
    properties: { [key: string]: VikingType };
}

export interface UnionType extends VikingType {
    kind: 'union';
    types: VikingType[];
}

export interface IntersectionType extends VikingType {
    kind: 'intersection';
    types: VikingType[];
}

export interface ClassType extends VikingType {
    kind: 'class';
    name: string;
    properties: { [key: string]: VikingType };
    methods: { [key: string]: FunctionType };
    superClass?: ClassType;
}

export interface TraitType extends VikingType {
    kind: 'trait';
    name: string;
    methods: { [key: string]: FunctionType };
}

export interface GenericType extends VikingType {
    kind: 'generic';
    name: string;
    constraints?: VikingType[];
}

export interface TypeVariable extends VikingType {
    kind: 'typevar';
    id: number;
    name?: string;
    bound?: VikingType;
}

// 类型环境
export class TypeEnvironment {
    private scopes: Map<string, VikingType>[] = [];
    private currentScope = 0;

    constructor() {
        this.pushScope();
        this.initBuiltins();
    }

    // 初始化内置类型和函数
    private initBuiltins() {
        // 内置类型
        this.define('number', {kind: 'primitive', name: 'number'});
        this.define('string', {kind: 'primitive', name: 'string'});
        this.define('boolean', {kind: 'primitive', name: 'boolean'});
        this.define('null', {kind: 'primitive', name: 'null'});
        this.define('undefined', {kind: 'primitive', name: 'undefined'});
        this.define('any', {kind: 'primitive', name: 'any'});

        // 内置函数
        this.define('print', {
            kind: 'function',
            parameters: [{kind: 'primitive', name: 'any'}],
            returnType: {kind: 'primitive', name: 'undefined'}
        });
    }

    pushScope() {
        this.scopes.push(new Map());
        this.currentScope++;
    }

    popScope() {
        if (this.scopes.length > 1) {
            this.scopes.pop();
            this.currentScope--;
        }
    }

    define(name: string, type: VikingType) {
        const currentScope = this.scopes[this.scopes.length - 1];
        currentScope.set(name, type);
    }

    lookup(name: string): VikingType | undefined {
        for (let i = this.scopes.length - 1; i >= 0; i--) {
            const type = this.scopes[i].get(name);
            if (type) {
                return type;
            }
        }
        return undefined;
    }

    clone(): TypeEnvironment {
        const newEnv = new TypeEnvironment();
        newEnv.scopes = this.scopes.map(scope => new Map(scope));
        newEnv.currentScope = this.currentScope;
        return newEnv;
    }
}

// 类型错误
export class TypeError extends Error {
    constructor(
        message: string,
        public location?: any,
        public expected?: VikingType,
        public actual?: VikingType
    ) {
        super(message);
        this.name = 'TypeError';
    }
}

// 类型检查器
export class TypeChecker {
    private env: TypeEnvironment;
    private nextTypeVarId = 0;
    private constraints: TypeConstraint[] = [];

    constructor() {
        this.env = new TypeEnvironment();
    }

    // 生成新的类型变量
    private freshTypeVar(name?: string): TypeVariable {
        return {
            kind: 'typevar',
            id: this.nextTypeVarId++,
            name
        };
    }

    // 主检查入口
    check(program: Program): { types: Map<ASTNode, VikingType>, errors: TypeError[] } {
        const types = new Map<ASTNode, VikingType>();
        const errors: TypeError[] = [];

        try {
            const programType = this.checkProgram(program, types);
            types.set(program, programType);
        } catch (error) {
            if (error instanceof TypeError) {
                errors.push(error);
            } else {
                errors.push(new TypeError(`Internal error: ${error.message}`));
            }
        }

        return {types, errors};
    }

    // 检查程序
    private checkProgram(program: Program, types: Map<ASTNode, VikingType>): VikingType {
        let lastType: VikingType = {kind: 'primitive', name: 'undefined'};

        for (const stmt of program.body) {
            lastType = this.checkStatement(stmt, types);
        }

        return lastType;
    }

    // 检查语句
    private checkStatement(stmt: Statement, types: Map<ASTNode, VikingType>): VikingType {
        let stmtType: VikingType;

        switch (stmt.type) {
            case 'ExpressionStatement':
                stmtType = this.checkExpression((stmt as ExpressionStatement).expression, types);
                break;

            case 'VariableDeclaration':
                stmtType = this.checkVariableDeclaration(stmt as VariableDeclaration, types);
                break;

            case 'FunctionDeclaration':
                stmtType = this.checkFunctionDeclaration(stmt as FunctionDeclaration, types);
                break;

            case 'IfStatement':
                stmtType = this.checkIfStatement(stmt as IfStatement, types);
                break;

            case 'BlockStatement':
                stmtType = this.checkBlockStatement(stmt as BlockStatement, types);
                break;

            case 'ReturnStatement':
                stmtType = this.checkReturnStatement(stmt as ReturnStatement, types);
                break;

            case 'ClassDeclaration':
                stmtType = this.checkClassDeclaration(stmt as ClassDeclaration, types);
                break;

            default:
                stmtType = {kind: 'primitive', name: 'undefined'};
        }

        types.set(stmt, stmtType);
        return stmtType;
    }

    // 检查表达式
    private checkExpression(expr: Expression, types: Map<ASTNode, VikingType>): VikingType {
        let exprType: VikingType;

        switch (expr.type) {
            case 'NumberLiteral':
                exprType = {kind: 'primitive', name: 'number'};
                break;

            case 'StringLiteral':
                exprType = {kind: 'primitive', name: 'string'};
                break;

            case 'BooleanLiteral':
                exprType = {kind: 'primitive', name: 'boolean'};
                break;

            case 'NullLiteral':
                exprType = {kind: 'primitive', name: 'null'};
                break;

            case 'UndefinedLiteral':
                exprType = {kind: 'primitive', name: 'undefined'};
                break;

            case 'IdentifierLiteral':
                exprType = this.checkIdentifier(expr as IdentifierLiteral, types);
                break;

            case 'BinaryExpression':
                exprType = this.checkBinaryExpression(expr as BinaryExpression, types);
                break;

            case 'UnaryExpression':
                exprType = this.checkUnaryExpression(expr as UnaryExpression, types);
                break;

            case 'AssignmentExpression':
                exprType = this.checkAssignmentExpression(expr as AssignmentExpression, types);
                break;

            case 'CallExpression':
                exprType = this.checkCallExpression(expr as CallExpression, types);
                break;

            case 'MemberExpression':
                exprType = this.checkMemberExpression(expr as MemberExpression, types);
                break;

            case 'ArrayExpression':
                exprType = this.checkArrayExpression(expr as ArrayExpression, types);
                break;

            case 'ObjectExpression':
                exprType = this.checkObjectExpression(expr as ObjectExpression, types);
                break;

            case 'ConditionalExpression':
                exprType = this.checkConditionalExpression(expr as ConditionalExpression, types);
                break;

            default:
                exprType = {kind: 'primitive', name: 'any'};
        }

        types.set(expr, exprType);
        return exprType;
    }

    // 检查标识符
    private checkIdentifier(identifier: IdentifierLiteral, types: Map<ASTNode, VikingType>): VikingType {
        const type = this.env.lookup(identifier.name);
        if (!type) {
            throw new TypeError(
                `Undefined variable: ${identifier.name}`,
                identifier.location
            );
        }
        return type;
    }

    // 检查二元表达式
    private checkBinaryExpression(expr: BinaryExpression, types: Map<ASTNode, VikingType>): VikingType {
        const leftType = this.checkExpression(expr.left, types);
        const rightType = this.checkExpression(expr.right, types);

        // 算术运算符
        if (['+', '-', '*', '/'].includes(expr.operator)) {
            if (expr.operator === '+') {
                // 字符串连接或数字加法
                if (this.isStringType(leftType) || this.isStringType(rightType)) {
                    return {kind: 'primitive', name: 'string'};
                }
                if (this.isNumberType(leftType) && this.isNumberType(rightType)) {
                    return {kind: 'primitive', name: 'number'};
                }
            } else {
                // 其他算术运算符只能用于数字
                if (!this.isNumberType(leftType) || !this.isNumberType(rightType)) {
                    throw new TypeError(
                        `Arithmetic operator ${expr.operator} requires number operands`,
                        expr.location,
                        {kind: 'primitive', name: 'number'},
                        leftType
                    );
                }
                return {kind: 'primitive', name: 'number'};
            }
        }

        // 比较运算符
        if (['==', '!=', '<', '<=', '>', '>='].includes(expr.operator)) {
            return {kind: 'primitive', name: 'boolean'};
        }

        // 逻辑运算符
        if (['&&', '||'].includes(expr.operator)) {
            return {kind: 'primitive', name: 'boolean'};
        }

        return {kind: 'primitive', name: 'any'};
    }

    // 检查一元表达式
    private checkUnaryExpression(expr: UnaryExpression, types: Map<ASTNode, VikingType>): VikingType {
        const operandType = this.checkExpression(expr.operand, types);

        switch (expr.operator) {
            case '-':
            case '+':
                if (!this.isNumberType(operandType)) {
                    throw new TypeError(
                        `Unary ${expr.operator} requires number operand`,
                        expr.location,
                        {kind: 'primitive', name: 'number'},
                        operandType
                    );
                }
                return {kind: 'primitive', name: 'number'};

            case '!':
                return {kind: 'primitive', name: 'boolean'};

            default:
                return {kind: 'primitive', name: 'any'};
        }
    }

    // 检查赋值表达式
    private checkAssignmentExpression(expr: AssignmentExpression, types: Map<ASTNode, VikingType>): VikingType {
        const rightType = this.checkExpression(expr.right, types);

        if (expr.left.type === 'IdentifierLiteral') {
            const identifier = expr.left as IdentifierLiteral;
            const leftType = this.env.lookup(identifier.name);

            if (!leftType) {
                throw new TypeError(
                    `Cannot assign to undefined variable: ${identifier.name}`,
                    expr.location
                );
            }

            // 检查类型兼容性
            if (!this.isAssignable(rightType, leftType)) {
                throw new TypeError(
                    `Type mismatch in assignment`,
                    expr.location,
                    leftType,
                    rightType
                );
            }
        }

        return rightType;
    }

    // 检查函数调用
    private checkCallExpression(expr: CallExpression, types: Map<ASTNode, VikingType>): VikingType {
        const funcType = this.checkExpression(expr.callee, types);

        if (funcType.kind !== 'function') {
            throw new TypeError(
                `Cannot call non-function type`,
                expr.location,
                {kind: 'function', parameters: [], returnType: {kind: 'primitive', name: 'any'}},
                funcType
            );
        }

        const functionType = funcType as FunctionType;
        const argTypes = expr.arguments.map(arg => this.checkExpression(arg, types));

        // 检查参数数量
        if (argTypes.length !== functionType.parameters.length) {
            throw new TypeError(
                `Function expects ${functionType.parameters.length} arguments, got ${argTypes.length}`,
                expr.location
            );
        }

        // 检查参数类型
        for (let i = 0; i < argTypes.length; i++) {
            if (!this.isAssignable(argTypes[i], functionType.parameters[i])) {
                throw new TypeError(
                    `Argument ${i + 1} type mismatch`,
                    expr.location,
                    functionType.parameters[i],
                    argTypes[i]
                );
            }
        }

        return functionType.returnType;
    }

    // 检查变量声明
    private checkVariableDeclaration(decl: VariableDeclaration, types: Map<ASTNode, VikingType>): VikingType {
        for (const declarator of decl.declarations) {
            const identifier = declarator.id as IdentifierLiteral;
            let varType: VikingType;

            if (declarator.init) {
                varType = this.checkExpression(declarator.init, types);
            } else {
                varType = {kind: 'primitive', name: 'undefined'};
            }

            // 如果有类型注解，检查兼容性
            if (declarator.typeAnnotation) {
                const annotationType = this.resolveTypeAnnotation(declarator.typeAnnotation);
                if (!this.isAssignable(varType, annotationType)) {
                    throw new TypeError(
                        `Variable type annotation mismatch`,
                        declarator.location,
                        annotationType,
                        varType
                    );
                }
                varType = annotationType;
            }

            this.env.define(identifier.name, varType);
        }

        return {kind: 'primitive', name: 'undefined'};
    }

    // 检查函数声明
    private checkFunctionDeclaration(decl: FunctionDeclaration, types: Map<ASTNode, VikingType>): VikingType {
        const paramTypes = decl.params.map(param => {
            // 简化处理，假设参数都有类型注解
            return param.typeAnnotation ?
                this.resolveTypeAnnotation(param.typeAnnotation) :
                {kind: 'primitive', name: 'any'};
        });

        const returnType = decl.returnType ?
            this.resolveTypeAnnotation(decl.returnType) :
            {kind: 'primitive', name: 'any'};

        const functionType: FunctionType = {
            kind: 'function',
            parameters: paramTypes,
            returnType,
            isAsync: decl.async,
            isGenerator: decl.generator
        };

        // 定义函数到环境中
        this.env.define(decl.id.name, functionType);

        // 检查函数体
        this.env.pushScope();

        // 添加参数到作用域
        for (let i = 0; i < decl.params.length; i++) {
            const param = decl.params[i];
            this.env.define((param.id as IdentifierLiteral).name, paramTypes[i]);
        }

        this.checkBlockStatement(decl.body, types);
        this.env.popScope();

        return functionType;
    }

    // 检查块语句
    private checkBlockStatement(stmt: BlockStatement, types: Map<ASTNode, VikingType>): VikingType {
        this.env.pushScope();

        let lastType: VikingType = {kind: 'primitive', name: 'undefined'};
        for (const statement of stmt.body) {
            lastType = this.checkStatement(statement, types);
        }

        this.env.popScope();
        return lastType;
    }

    // 其他检查方法的简化实现
    private checkIfStatement(stmt: IfStatement, types: Map<ASTNode, VikingType>): VikingType {
        this.checkExpression(stmt.test, types);
        this.checkStatement(stmt.consequent, types);
        if (stmt.alternate) {
            this.checkStatement(stmt.alternate, types);
        }
        return {kind: 'primitive', name: 'undefined'};
    }

    private checkReturnStatement(stmt: ReturnStatement, types: Map<ASTNode, VikingType>): VikingType {
        if (stmt.argument) {
            return this.checkExpression(stmt.argument, types);
        }
        return {kind: 'primitive', name: 'undefined'};
    }

    private checkClassDeclaration(stmt: ClassDeclaration, types: Map<ASTNode, VikingType>): VikingType {
        // 简化的类检查
        return {kind: 'primitive', name: 'undefined'};
    }

    private checkMemberExpression(expr: MemberExpression, types: Map<ASTNode, VikingType>): VikingType {
        const objectType = this.checkExpression(expr.object, types);
        // 简化处理
        return {kind: 'primitive', name: 'any'};
    }

    private checkArrayExpression(expr: ArrayExpression, types: Map<ASTNode, VikingType>): VikingType {
        const elementTypes = expr.elements.map(elem => this.checkExpression(elem, types));

        if (elementTypes.length === 0) {
            return {kind: 'array', elementType: {kind: 'primitive', name: 'any'}};
        }

        // 简化处理：使用第一个元素的类型
        return {kind: 'array', elementType: elementTypes[0]};
    }

    private checkObjectExpression(expr: ObjectExpression, types: Map<ASTNode, VikingType>): VikingType {
        const properties: { [key: string]: VikingType } = {};

        for (const prop of expr.properties) {
            if (prop.key.type === 'IdentifierLiteral') {
                const keyName = (prop.key as IdentifierLiteral).name;
                properties[keyName] = this.checkExpression(prop.value, types);
            }
        }

        return {kind: 'object', properties};
    }

    private checkConditionalExpression(expr: ConditionalExpression, types: Map<ASTNode, VikingType>): VikingType {
        this.checkExpression(expr.test, types);
        const thenType = this.checkExpression(expr.consequent, types);
        const elseType = this.checkExpression(expr.alternate, types);

        // 简化处理：返回联合类型
        return {kind: 'union', types: [thenType, elseType]};
    }

    // 类型工具方法
    private isStringType(type: VikingType): boolean {
        return type.kind === 'primitive' && type.name === 'string';
    }

    private isNumberType(type: VikingType): boolean {
        return type.kind === 'primitive' && type.name === 'number';
    }

    private isBooleanType(type: VikingType): boolean {
        return type.kind === 'primitive' && type.name === 'boolean';
    }

    private isAssignable(from: VikingType, to: VikingType): boolean {
        // 简化的类型兼容性检查
        if (to.kind === 'primitive' && to.name === 'any') {
            return true;
        }

        if (from.kind === 'primitive' && to.kind === 'primitive') {
            return from.name === to.name;
        }

        // 更复杂的类型兼容性检查可以在这里添加
        return false;
    }

    private resolveTypeAnnotation(annotation: any): VikingType {
        // 简化的类型注解解析
        if (typeof annotation === 'string') {
            return {kind: 'primitive', name: annotation as any};
        }

        return {kind: 'primitive', name: 'any'};
    }
}

// 类型约束（用于类型推断）
interface TypeConstraint {
    left: VikingType;
    right: VikingType;
    location?: any;
}