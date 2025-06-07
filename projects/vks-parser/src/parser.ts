/**
 * Viking Script Parser
 * 语法分析器，将 token 流转换为 AST
 */

import {Location, Token, TokenType} from './lexer';
import {
    ArrayExpression,
    ArrayPattern,
    AssignmentExpression,
    ASTNode,
    AwaitExpression,
    BinaryExpression,
    BlockStatement,
    BooleanLiteral,
    BreakStatement,
    CallExpression,
    ClassDeclaration,
    ConditionalExpression,
    ContinueStatement,
    ExpressionStatement,
    FunctionDeclaration,
    FunctionExpression,
    HandlerStatement,
    Identifier,
    IdentifierPattern,
    IdentifierType,
    IfStatement,
    ImplDeclaration,
    LoopStatement,
    MacroDeclaration,
    MatchStatement,
    MemberExpression,
    NodeType,
    NullLiteral,
    NumberLiteral,
    ObjectExpression,
    ObjectPattern,
    Program,
    RaiseStatement,
    ReturnStatement,
    StringLiteral,
    TraitDeclaration,
    TryStatement,
    TypeAnnotation,
    TypeDeclaration,
    TypeParameter,
    UnaryExpression,
    UndefinedLiteral,
    UnionDeclaration,
    VariableDeclaration,
    YieldExpression
} from '../../vks-hir/src/nodes';

export class ParseError extends Error {
    constructor(
        message: string,
        public location: Location
    ) {
        super(message);
        this.name = 'ParseError';
    }
}

export class Parser {
    private tokens: Token[];
    private current: number = 0;
    private filename: string;

    constructor(tokens: Token[], filename: string = '<unknown>') {
        this.tokens = tokens.filter(token => token.type !== TokenType.NEWLINE); // 过滤换行符
        this.filename = filename;
    }

    parse(): Program {
        const statements: ASTNode[] = [];
        const start = this.getCurrentLocation();

        while (!this.isAtEnd()) {
            try {
                const stmt = this.parseStatement();
                if (stmt) {
                    statements.push(stmt);
                }
            } catch (error) {
                if (error instanceof ParseError) {
                    // 错误恢复：跳到下一个语句
                    this.synchronize();
                    throw error; // 重新抛出错误
                } else {
                    throw error;
                }
            }
        }

        const end = this.getPreviousLocation();
        return {
            type: NodeType.Program,
            body: statements,
            location: {start: start.start, end: end.end, file: this.filename}
        } as Program;
    }

    private parseStatement(): ASTNode | null {
        try {
            // 宏声明
            if (this.match(TokenType.MACRO)) {
                return this.parseMacroDeclaration();
            }

            // 类型声明
            if (this.match(TokenType.TYPE)) {
                return this.parseTypeDeclaration();
            }

            // 变量声明
            if (this.match(TokenType.LET, TokenType.CONST)) {
                return this.parseVariableDeclaration();
            }

            // 函数声明
            if (this.match(TokenType.FUNCTION, TokenType.ASYNC)) {
                return this.parseFunctionDeclaration();
            }

            // 类声明
            if (this.match(TokenType.CLASS)) {
                return this.parseClassDeclaration();
            }

            // 联合类型声明
            if (this.match(TokenType.UNION)) {
                return this.parseUnionDeclaration();
            }

            // Trait 声明
            if (this.match(TokenType.TRAIT)) {
                return this.parseTraitDeclaration();
            }

            // Impl 声明
            if (this.match(TokenType.IMPL)) {
                return this.parseImplDeclaration();
            }

            // 控制流语句
            if (this.match(TokenType.IF)) {
                return this.parseIfStatement();
            }

            if (this.match(TokenType.MATCH)) {
                return this.parseMatchStatement();
            }

            if (this.match(TokenType.LOOP)) {
                return this.parseLoopStatement();
            }

            if (this.match(TokenType.BREAK)) {
                return this.parseBreakStatement();
            }

            if (this.match(TokenType.CONTINUE)) {
                return this.parseContinueStatement();
            }

            if (this.match(TokenType.RETURN)) {
                return this.parseReturnStatement();
            }

            // 异常处理
            if (this.match(TokenType.TRY)) {
                return this.parseTryStatement();
            }

            if (this.match(TokenType.HANDLER)) {
                return this.parseHandlerStatement();
            }

            if (this.match(TokenType.RAISE)) {
                return this.parseRaiseStatement();
            }

            // 代码块
            if (this.check(TokenType.LEFT_BRACE)) {
                return this.parseBlockStatement();
            }

            // 表达式语句
            return this.parseExpressionStatement();
        } catch (error) {
            if (error instanceof ParseError) {
                throw error;
            }
            throw new ParseError(`Unexpected error: ${error}`, this.getCurrentLocation());
        }
    }

    private parseVariableDeclaration(): VariableDeclaration {
        const start = this.getPreviousLocation();
        const isConst = this.previous().type === TokenType.CONST;
        let isMutable = false;

        if (!isConst && this.match(TokenType.MUT)) {
            isMutable = true;
        }

        const id = this.parsePattern();
        let typeAnnotation: TypeAnnotation | null = null;
        let init: ASTNode | null = null;

        if (this.match(TokenType.COLON)) {
            typeAnnotation = this.parseTypeAnnotation();
        }

        if (this.match(TokenType.ASSIGN)) {
            init = this.parseExpression();
        }

        this.consume(TokenType.SEMICOLON, "Expected ';' after variable declaration");

        const end = this.getPreviousLocation();
        return {
            type: NodeType.VariableDeclaration,
            id,
            init,
            typeAnnotation,
            kind: isConst ? 'const' : 'let',
            mutable: isMutable,
            location: {start: start.start, end: end.end, file: this.filename}
        } as VariableDeclaration;
    }

    private parseFunctionDeclaration(): FunctionDeclaration {
        const start = this.getPreviousLocation();
        const isAsync = this.previous().type === TokenType.ASYNC;

        if (isAsync) {
            this.consume(TokenType.FUNCTION, "Expected 'function' after 'async'");
        }

        let isGenerator = false;
        if (this.match(TokenType.YIELD)) {
            isGenerator = true;
            this.consume(TokenType.FUNCTION, "Expected 'function' after 'yield'");
        }

        const name = this.consume(TokenType.IDENTIFIER, "Expected function name").value;

        let typeParameters: TypeParameter[] = [];
        if (this.match(TokenType.GENERIC_START)) {
            typeParameters = this.parseTypeParameters();
            this.consume(TokenType.GREATER_THAN, "Expected '>' after type parameters");
        }

        this.consume(TokenType.LEFT_PAREN, "Expected '(' after function name");
        const params = this.parseParameterList();
        this.consume(TokenType.RIGHT_PAREN, "Expected ')' after parameters");

        let returnType: TypeAnnotation | null = null;
        if (this.match(TokenType.ARROW)) {
            returnType = this.parseTypeAnnotation();
        }

        const body = this.parseBlockStatement();
        const end = this.getPreviousLocation();

        return {
            type: NodeType.FunctionDeclaration,
            id: {
                type: NodeType.Identifier,
                name,
                location: this.getCurrentLocation()
            } as Identifier,
            params,
            body,
            async: isAsync,
            generator: isGenerator,
            typeParameters,
            returnType,
            location: {start: start.start, end: end.end, file: this.filename}
        } as FunctionDeclaration;
    }

    private parseClassDeclaration(): ClassDeclaration {
        const start = this.getPreviousLocation();
        const name = this.consume(TokenType.IDENTIFIER, "Expected class name").value;

        let typeParameters: TypeParameter[] = [];
        if (this.match(TokenType.GENERIC_START)) {
            typeParameters = this.parseTypeParameters();
            this.consume(TokenType.GREATER_THAN, "Expected '>' after type parameters");
        }

        let superClass: Identifier | null = null;
        if (this.match(TokenType.COLON)) {
            const superName = this.consume(TokenType.IDENTIFIER, "Expected superclass name").value;
            superClass = {
                type: NodeType.Identifier,
                name: superName,
                location: this.getPreviousLocation()
            } as Identifier;
        }

        this.consume(TokenType.LEFT_BRACE, "Expected '{' before class body");
        const body: ASTNode[] = [];

        while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
            if (this.match(TokenType.CONSTRUCTOR)) {
                body.push(this.parseConstructor());
            } else if (this.check(TokenType.IDENTIFIER)) {
                body.push(this.parseClassMember());
            } else {
                this.error("Expected class member");
            }
        }

        this.consume(TokenType.RIGHT_BRACE, "Expected '}' after class body");
        const end = this.getPreviousLocation();

        return {
            type: NodeType.ClassDeclaration,
            id: {
                type: NodeType.Identifier,
                name,
                location: this.getCurrentLocation()
            } as Identifier,
            superClass,
            body,
            typeParameters,
            location: {start: start.start, end: end.end, file: this.filename}
        } as ClassDeclaration;
    }

    private parseIfStatement(): IfStatement {
        const start = this.getPreviousLocation();
        const test = this.parseExpression();
        const consequent = this.parseBlockStatement();
        let alternate: ASTNode | null = null;

        if (this.match(TokenType.ELSE)) {
            if (this.check(TokenType.IF)) {
                alternate = this.parseStatement();
            } else {
                alternate = this.parseBlockStatement();
            }
        }

        const end = this.getPreviousLocation();
        return {
            type: NodeType.IfStatement,
            test,
            consequent,
            alternate,
            location: {start: start.start, end: end.end, file: this.filename}
        } as IfStatement;
    }

    private parseMatchStatement(): MatchStatement {
        const start = this.getPreviousLocation();
        const discriminant = this.parseExpression();

        this.consume(TokenType.LEFT_BRACE, "Expected '{' after match expression");
        const cases: any[] = [];

        while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
            if (this.match(TokenType.CASE)) {
                const pattern = this.parsePattern();
                let guard: ASTNode | null = null;

                if (this.match(TokenType.IF)) {
                    guard = this.parseExpression();
                }

                this.consume(TokenType.COLON, "Expected ':' after case pattern");
                const consequent: ASTNode[] = [];

                while (!this.check(TokenType.CASE) && !this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
                    const stmt = this.parseStatement();
                    if (stmt) consequent.push(stmt);
                }

                cases.push({pattern, guard, consequent});
            } else {
                this.error("Expected 'case' in match statement");
            }
        }

        this.consume(TokenType.RIGHT_BRACE, "Expected '}' after match cases");
        const end = this.getPreviousLocation();

        return {
            type: NodeType.MatchStatement,
            discriminant,
            cases,
            location: {start: start.start, end: end.end, file: this.filename}
        } as MatchStatement;
    }

    private parseBlockStatement(): BlockStatement {
        const start = this.getCurrentLocation();
        this.consume(TokenType.LEFT_BRACE, "Expected '{'");

        const body: ASTNode[] = [];
        while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
            const stmt = this.parseStatement();
            if (stmt) body.push(stmt);
        }

        this.consume(TokenType.RIGHT_BRACE, "Expected '}'");
        const end = this.getPreviousLocation();

        return {
            type: NodeType.BlockStatement,
            body,
            location: {start: start.start, end: end.end, file: this.filename}
        } as BlockStatement;
    }

    private parseExpressionStatement(): ExpressionStatement {
        const start = this.getCurrentLocation();
        const expression = this.parseExpression();

        if (this.check(TokenType.SEMICOLON)) {
            this.advance();
        }

        const end = this.getPreviousLocation();
        return {
            type: NodeType.ExpressionStatement,
            expression,
            location: {start: start.start, end: end.end, file: this.filename}
        } as ExpressionStatement;
    }

    private parseExpression(): ASTNode {
        return this.parseAssignment();
    }

    private parseAssignment(): ASTNode {
        const expr = this.parseConditional();

        if (this.match(TokenType.ASSIGN, TokenType.PLUS_ASSIGN, TokenType.MINUS_ASSIGN,
            TokenType.MULTIPLY_ASSIGN, TokenType.DIVIDE_ASSIGN)) {
            const operator = this.previous().value;
            const right = this.parseAssignment();
            const end = this.getPreviousLocation();

            return {
                type: NodeType.AssignmentExpression,
                left: expr,
                operator,
                right,
                location: {start: expr.location.start, end: end.end, file: this.filename}
            } as AssignmentExpression;
        }

        return expr;
    }

    private parseConditional(): ASTNode {
        const expr = this.parseLogicalOr();

        if (this.match(TokenType.QUESTION)) {
            const consequent = this.parseExpression();
            this.consume(TokenType.COLON, "Expected ':' after '?' in conditional expression");
            const alternate = this.parseConditional();
            const end = this.getPreviousLocation();

            return {
                type: NodeType.ConditionalExpression,
                test: expr,
                consequent,
                alternate,
                location: {start: expr.location.start, end: end.end, file: this.filename}
            } as ConditionalExpression;
        }

        return expr;
    }

    private parseLogicalOr(): ASTNode {
        let expr = this.parseLogicalAnd();

        while (this.match(TokenType.LOGICAL_OR)) {
            const operator = this.previous().value;
            const right = this.parseLogicalAnd();
            const end = this.getPreviousLocation();

            expr = {
                type: NodeType.BinaryExpression,
                left: expr,
                operator,
                right,
                location: {start: expr.location.start, end: end.end, file: this.filename}
            } as BinaryExpression;
        }

        return expr;
    }

    private parseLogicalAnd(): ASTNode {
        let expr = this.parseEquality();

        while (this.match(TokenType.LOGICAL_AND)) {
            const operator = this.previous().value;
            const right = this.parseEquality();
            const end = this.getPreviousLocation();

            expr = {
                type: NodeType.BinaryExpression,
                left: expr,
                operator,
                right,
                location: {start: expr.location.start, end: end.end, file: this.filename}
            } as BinaryExpression;
        }

        return expr;
    }

    private parseEquality(): ASTNode {
        let expr = this.parseComparison();

        while (this.match(TokenType.EQUAL, TokenType.NOT_EQUAL)) {
            const operator = this.previous().value;
            const right = this.parseComparison();
            const end = this.getPreviousLocation();

            expr = {
                type: NodeType.BinaryExpression,
                left: expr,
                operator,
                right,
                location: {start: expr.location.start, end: end.end, file: this.filename}
            } as BinaryExpression;
        }

        return expr;
    }

    private parseComparison(): ASTNode {
        let expr = this.parseTerm();

        while (this.match(TokenType.GREATER_THAN, TokenType.GREATER_EQUAL,
            TokenType.LESS_THAN, TokenType.LESS_EQUAL)) {
            const operator = this.previous().value;
            const right = this.parseTerm();
            const end = this.getPreviousLocation();

            expr = {
                type: NodeType.BinaryExpression,
                left: expr,
                operator,
                right,
                location: {start: expr.location.start, end: end.end, file: this.filename}
            } as BinaryExpression;
        }

        return expr;
    }

    private parseTerm(): ASTNode {
        let expr = this.parseFactor();

        while (this.match(TokenType.MINUS, TokenType.PLUS)) {
            const operator = this.previous().value;
            const right = this.parseFactor();
            const end = this.getPreviousLocation();

            expr = {
                type: NodeType.BinaryExpression,
                left: expr,
                operator,
                right,
                location: {start: expr.location.start, end: end.end, file: this.filename}
            } as BinaryExpression;
        }

        return expr;
    }

    private parseFactor(): ASTNode {
        let expr = this.parseUnary();

        while (this.match(TokenType.DIVIDE, TokenType.MULTIPLY, TokenType.MODULO)) {
            const operator = this.previous().value;
            const right = this.parseUnary();
            const end = this.getPreviousLocation();

            expr = {
                type: NodeType.BinaryExpression,
                left: expr,
                operator,
                right,
                location: {start: expr.location.start, end: end.end, file: this.filename}
            } as BinaryExpression;
        }

        return expr;
    }

    private parseUnary(): ASTNode {
        if (this.match(TokenType.LOGICAL_NOT, TokenType.MINUS, TokenType.PLUS)) {
            const start = this.getPreviousLocation();
            const operator = this.previous().value;
            const argument = this.parseUnary();
            const end = this.getPreviousLocation();

            return {
                type: NodeType.UnaryExpression,
                operator,
                argument,
                prefix: true,
                location: {start: start.start, end: end.end, file: this.filename}
            } as UnaryExpression;
        }

        return this.parsePostfix();
    }

    private parsePostfix(): ASTNode {
        let expr = this.parsePrimary();

        while (true) {
            if (this.match(TokenType.LEFT_PAREN)) {
                // 函数调用
                const args = this.parseArgumentList();
                this.consume(TokenType.RIGHT_PAREN, "Expected ')' after arguments");
                const end = this.getPreviousLocation();

                expr = {
                    type: NodeType.CallExpression,
                    callee: expr,
                    arguments: args,
                    location: {start: expr.location.start, end: end.end, file: this.filename}
                } as CallExpression;
            } else if (this.match(TokenType.LEFT_BRACKET)) {
                // 数组访问
                const property = this.parseExpression();
                this.consume(TokenType.RIGHT_BRACKET, "Expected ']' after array index");
                const end = this.getPreviousLocation();

                expr = {
                    type: NodeType.MemberExpression,
                    object: expr,
                    property,
                    computed: true,
                    location: {start: expr.location.start, end: end.end, file: this.filename}
                } as MemberExpression;
            } else if (this.match(TokenType.DOT)) {
                // 属性访问
                const property = this.consume(TokenType.IDENTIFIER, "Expected property name after '.'");
                const end = this.getPreviousLocation();

                expr = {
                    type: NodeType.MemberExpression,
                    object: expr,
                    property: {
                        type: NodeType.Identifier,
                        name: property.value,
                        location: property.location
                    } as Identifier,
                    computed: false,
                    location: {start: expr.location.start, end: end.end, file: this.filename}
                } as MemberExpression;
            } else {
                break;
            }
        }

        return expr;
    }

    private parsePrimary(): ASTNode {
        // 字面量
        if (this.match(TokenType.NUMBER)) {
            const token = this.previous();
            return {
                type: NodeType.NumberLiteral,
                value: parseFloat(token.value),
                raw: token.value,
                location: token.location
            } as NumberLiteral;
        }

        if (this.match(TokenType.STRING)) {
            const token = this.previous();
            return {
                type: NodeType.StringLiteral,
                value: token.value,
                raw: token.raw || token.value,
                location: token.location
            } as StringLiteral;
        }

        if (this.match(TokenType.BOOLEAN)) {
            const token = this.previous();
            return {
                type: NodeType.BooleanLiteral,
                value: token.value === 'true',
                raw: token.value,
                location: token.location
            } as BooleanLiteral;
        }

        if (this.match(TokenType.NULL)) {
            const token = this.previous();
            return {
                type: NodeType.NullLiteral,
                value: null,
                raw: token.value,
                location: token.location
            } as NullLiteral;
        }

        if (this.match(TokenType.UNDEFINED)) {
            const token = this.previous();
            return {
                type: NodeType.UndefinedLiteral,
                value: undefined,
                raw: token.value,
                location: token.location
            } as UndefinedLiteral;
        }

        // 标识符
        if (this.match(TokenType.IDENTIFIER)) {
            const token = this.previous();
            return {
                type: NodeType.Identifier,
                name: token.value,
                location: token.location
            } as Identifier;
        }

        // 括号表达式
        if (this.match(TokenType.LEFT_PAREN)) {
            const expr = this.parseExpression();
            this.consume(TokenType.RIGHT_PAREN, "Expected ')' after expression");
            return expr;
        }

        // 数组字面量
        if (this.match(TokenType.LEFT_BRACKET)) {
            return this.parseArrayExpression();
        }

        // 对象字面量
        if (this.match(TokenType.LEFT_BRACE)) {
            return this.parseObjectExpression();
        }

        // 函数表达式
        if (this.match(TokenType.FUNCTION)) {
            return this.parseFunctionExpression();
        }

        // await 表达式
        if (this.match(TokenType.AWAIT)) {
            const start = this.getPreviousLocation();
            const argument = this.parseUnary();
            const end = this.getPreviousLocation();

            return {
                type: NodeType.AwaitExpression,
                argument,
                location: {start: start.start, end: end.end, file: this.filename}
            } as AwaitExpression;
        }

        // yield 表达式
        if (this.match(TokenType.YIELD)) {
            const start = this.getPreviousLocation();
            let argument: ASTNode | null = null;
            let delegate = false;

            if (!this.check(TokenType.SEMICOLON) && !this.isAtEnd()) {
                argument = this.parseExpression();
            }

            const end = this.getPreviousLocation();
            return {
                type: NodeType.YieldExpression,
                argument,
                delegate,
                location: {start: start.start, end: end.end, file: this.filename}
            } as YieldExpression;
        }

        throw this.error("Expected expression");
    }

    private parseArrayExpression(): ArrayExpression {
        const start = this.getPreviousLocation();
        const elements: ASTNode[] = [];

        if (!this.check(TokenType.RIGHT_BRACKET)) {
            do {
                if (this.check(TokenType.COMMA)) {
                    elements.push(null as any); // 稀疏数组
                } else {
                    elements.push(this.parseExpression());
                }
            } while (this.match(TokenType.COMMA));
        }

        this.consume(TokenType.RIGHT_BRACKET, "Expected ']' after array elements");
        const end = this.getPreviousLocation();

        return {
            type: NodeType.ArrayExpression,
            elements,
            location: {start: start.start, end: end.end, file: this.filename}
        } as ArrayExpression;
    }

    private parseObjectExpression(): ObjectExpression {
        const start = this.getPreviousLocation();
        const properties: any[] = [];

        if (!this.check(TokenType.RIGHT_BRACE)) {
            do {
                let key: ASTNode;
                let value: ASTNode;
                let computed = false;
                let method = false;
                let shorthand = false;

                if (this.match(TokenType.LEFT_BRACKET)) {
                    // 计算属性名
                    key = this.parseExpression();
                    this.consume(TokenType.RIGHT_BRACKET, "Expected ']' after computed property");
                    computed = true;
                } else if (this.check(TokenType.IDENTIFIER)) {
                    const name = this.advance().value;
                    key = {
                        type: NodeType.Identifier,
                        name,
                        location: this.getPreviousLocation()
                    } as Identifier;
                } else {
                    key = this.parseExpression();
                }

                if (this.match(TokenType.COLON)) {
                    value = this.parseExpression();
                } else if (key.type === NodeType.Identifier) {
                    // 简写属性
                    value = key;
                    shorthand = true;
                } else {
                    throw this.error("Expected ':' after property key");
                }

                properties.push({key, value, computed, method, shorthand});
            } while (this.match(TokenType.COMMA));
        }

        this.consume(TokenType.RIGHT_BRACE, "Expected '}' after object properties");
        const end = this.getPreviousLocation();

        return {
            type: NodeType.ObjectExpression,
            properties,
            location: {start: start.start, end: end.end, file: this.filename}
        } as ObjectExpression;
    }

    private parsePattern(): ASTNode {
        // 简化的模式解析
        if (this.check(TokenType.IDENTIFIER)) {
            const name = this.advance().value;
            return {
                type: NodeType.IdentifierPattern,
                name,
                location: this.getPreviousLocation()
            } as IdentifierPattern;
        }

        if (this.check(TokenType.LEFT_BRACKET)) {
            return this.parseArrayPattern();
        }

        if (this.check(TokenType.LEFT_BRACE)) {
            return this.parseObjectPattern();
        }

        // 字面量模式
        return this.parseExpression();
    }

    private parseArrayPattern(): ArrayPattern {
        const start = this.getCurrentLocation();
        this.consume(TokenType.LEFT_BRACKET, "Expected '['");

        const elements: ASTNode[] = [];

        if (!this.check(TokenType.RIGHT_BRACKET)) {
            do {
                if (this.check(TokenType.COMMA)) {
                    elements.push(null as any);
                } else {
                    elements.push(this.parsePattern());
                }
            } while (this.match(TokenType.COMMA));
        }

        this.consume(TokenType.RIGHT_BRACKET, "Expected ']'");
        const end = this.getPreviousLocation();

        return {
            type: NodeType.ArrayPattern,
            elements,
            location: {start: start.start, end: end.end, file: this.filename}
        } as ArrayPattern;
    }

    private parseObjectPattern(): ObjectPattern {
        const start = this.getCurrentLocation();
        this.consume(TokenType.LEFT_BRACE, "Expected '{'");

        const properties: any[] = [];

        if (!this.check(TokenType.RIGHT_BRACE)) {
            do {
                const key = this.consume(TokenType.IDENTIFIER, "Expected property name").value;
                let value: ASTNode;

                if (this.match(TokenType.COLON)) {
                    value = this.parsePattern();
                } else {
                    value = {
                        type: NodeType.IdentifierPattern,
                        name: key,
                        location: this.getPreviousLocation()
                    } as IdentifierPattern;
                }

                properties.push({key, value});
            } while (this.match(TokenType.COMMA));
        }

        this.consume(TokenType.RIGHT_BRACE, "Expected '}'");
        const end = this.getPreviousLocation();

        return {
            type: NodeType.ObjectPattern,
            properties,
            location: {start: start.start, end: end.end, file: this.filename}
        } as ObjectPattern;
    }

    private parseTypeAnnotation(): TypeAnnotation {
        const typeExpr = this.parseTypeExpression();
        return {
            type: NodeType.TypeAnnotation,
            typeAnnotation: typeExpr,
            location: typeExpr.location
        } as TypeAnnotation;
    }

    private parseTypeExpression(): ASTNode {
        // 简化的类型表达式解析
        if (this.match(TokenType.IDENTIFIER)) {
            const name = this.previous().value;
            return {
                type: NodeType.IdentifierType,
                name,
                location: this.getPreviousLocation()
            } as IdentifierType;
        }

        throw this.error("Expected type expression");
    }

    // 辅助方法
    private parseParameterList(): any[] {
        const params: any[] = [];

        if (!this.check(TokenType.RIGHT_PAREN)) {
            do {
                const pattern = this.parsePattern();
                let typeAnnotation: TypeAnnotation | null = null;

                if (this.match(TokenType.COLON)) {
                    typeAnnotation = this.parseTypeAnnotation();
                }

                params.push({pattern, typeAnnotation});
            } while (this.match(TokenType.COMMA));
        }

        return params;
    }

    private parseArgumentList(): ASTNode[] {
        const args: ASTNode[] = [];

        if (!this.check(TokenType.RIGHT_PAREN)) {
            do {
                args.push(this.parseExpression());
            } while (this.match(TokenType.COMMA));
        }

        return args;
    }

    private parseTypeParameters(): TypeParameter[] {
        const params: TypeParameter[] = [];

        if (!this.check(TokenType.GREATER_THAN)) {
            do {
                const name = this.consume(TokenType.IDENTIFIER, "Expected type parameter name").value;
                let constraint: ASTNode | null = null;
                let defaultType: ASTNode | null = null;

                if (this.match(TokenType.COLON)) {
                    constraint = this.parseTypeExpression();
                }

                if (this.match(TokenType.ASSIGN)) {
                    defaultType = this.parseTypeExpression();
                }

                params.push({
                    type: NodeType.TypeParameter,
                    name,
                    constraint,
                    default: defaultType,
                    location: this.getCurrentLocation()
                } as TypeParameter);
            } while (this.match(TokenType.COMMA));
        }

        return params;
    }

    // 占位符方法（需要完整实现）
    private parseMacroDeclaration(): MacroDeclaration {
        throw this.error("Macro declarations not yet implemented");
    }

    private parseTypeDeclaration(): TypeDeclaration {
        throw this.error("Type declarations not yet implemented");
    }

    private parseUnionDeclaration(): UnionDeclaration {
        throw this.error("Union declarations not yet implemented");
    }

    private parseTraitDeclaration(): TraitDeclaration {
        throw this.error("Trait declarations not yet implemented");
    }

    private parseImplDeclaration(): ImplDeclaration {
        throw this.error("Impl declarations not yet implemented");
    }

    private parseLoopStatement(): LoopStatement {
        throw this.error("Loop statements not yet implemented");
    }

    private parseBreakStatement(): BreakStatement {
        throw this.error("Break statements not yet implemented");
    }

    private parseContinueStatement(): ContinueStatement {
        throw this.error("Continue statements not yet implemented");
    }

    private parseReturnStatement(): ReturnStatement {
        const start = this.getPreviousLocation();
        let argument: ASTNode | null = null;

        if (!this.check(TokenType.SEMICOLON) && !this.isAtEnd()) {
            argument = this.parseExpression();
        }

        this.consume(TokenType.SEMICOLON, "Expected ';' after return statement");
        const end = this.getPreviousLocation();

        return {
            type: NodeType.ReturnStatement,
            argument,
            location: {start: start.start, end: end.end, file: this.filename}
        } as ReturnStatement;
    }

    private parseTryStatement(): TryStatement {
        throw this.error("Try statements not yet implemented");
    }

    private parseHandlerStatement(): HandlerStatement {
        throw this.error("Handler statements not yet implemented");
    }

    private parseRaiseStatement(): RaiseStatement {
        throw this.error("Raise statements not yet implemented");
    }

    private parseConstructor(): ASTNode {
        throw this.error("Constructor parsing not yet implemented");
    }

    private parseClassMember(): ASTNode {
        throw this.error("Class member parsing not yet implemented");
    }

    private parseFunctionExpression(): FunctionExpression {
        throw this.error("Function expressions not yet implemented");
    }

    // 工具方法
    private match(...types: TokenType[]): boolean {
        for (const type of types) {
            if (this.check(type)) {
                this.advance();
                return true;
            }
        }
        return false;
    }

    private check(type: TokenType): boolean {
        if (this.isAtEnd()) return false;
        return this.peek().type === type;
    }

    private advance(): Token {
        if (!this.isAtEnd()) this.current++;
        return this.previous();
    }

    private isAtEnd(): boolean {
        return this.peek().type === TokenType.EOF;
    }

    private peek(): Token {
        return this.tokens[this.current];
    }

    private previous(): Token {
        return this.tokens[this.current - 1];
    }

    private consume(type: TokenType, message: string): Token {
        if (this.check(type)) return this.advance();
        throw this.error(message);
    }

    private error(message: string): ParseError {
        const location = this.getCurrentLocation();
        return new ParseError(message, location);
    }

    private synchronize(): void {
        this.advance();

        while (!this.isAtEnd()) {
            if (this.previous().type === TokenType.SEMICOLON) return;

            switch (this.peek().type) {
                case TokenType.CLASS:
                case TokenType.FUNCTION:
                case TokenType.LET:
                case TokenType.FOR:
                case TokenType.IF:
                case TokenType.WHILE:
                case TokenType.RETURN:
                    return;
            }

            this.advance();
        }
    }

    private getCurrentLocation(): Location {
        const token = this.peek();
        return token ? token.location : {
            start: {line: 1, column: 1},
            end: {line: 1, column: 1},
            file: this.filename
        };
    }

    private getPreviousLocation(): Location {
        const token = this.previous();
        return token ? token.location : {
            start: {line: 1, column: 1},
            end: {line: 1, column: 1},
            file: this.filename
        };
    }
}