// 导出所有解析器模块
export * from './literal';
export * from './type';
export * from './pattern';
export * from './expression';
export * from './statement';

// 重新导出主要的解析器函数
export {
    parseLiteral
} from './literal';

export {
    parseTypeAnnotation,
    parseTypeParameter
} from './type';

export {
    parsePattern
} from './pattern';

export {
    parseExpression,
    parseNamepath,
    parseArrayExpression,
    parseObjectExpression,
    parseFunctionExpression,
    parseArrowFunctionExpression,
    parseYieldExpression,
    parseAwaitExpression,
    parseMatchExpression
} from './expression';

export {
    parseProgram,
    parseStatement,
    parseExpressionStatement,
    parseBlockStatement,
    parseVariableDeclaration,
    parseFunctionDeclaration,
    parseClassDeclaration,
    parseUnionDeclaration,
    parseTraitDeclaration,
    parseImplDeclaration,
    parseIfStatement,
    parseMatchStatement,
    parseLoopStatement,
    parseBreakStatement,
    parseContinueStatement,
    parseReturnStatement,
    parseTryStatement,
    parseHandlerStatement,
    parseRaiseStatement,
    parseNamespaceDeclaration,
    parseImportDeclaration,
    parseMacroDeclaration,
    parseTypeDeclaration
} from './statement';
export {parseStringLiteral} from "./literal/parseStringLiteral";
export {parseIdentifier} from "@parser/literal/parseIdentifier";