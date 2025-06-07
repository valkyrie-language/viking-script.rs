export * from "./parseStringLiteral";
export * from "./parseIdentifier";
export * from "./parseNumberLiteral";

import {choice, Parser} from "@helper";
import {parseBooleanLiteral, parseIdentifier, parseNullLiteral} from "./parseIdentifier";
import {parseStringLiteral} from "./parseStringLiteral";
import {parseNumberLiteral} from "./parseNumberLiteral";

// 通用字面量解析器
export const parseLiteral: Parser<LiteralNode> = choice(
    parseNullLiteral,
    parseBooleanLiteral,
    parseIdentifier,
    parseNumberLiteral,
    parseStringLiteral,
)