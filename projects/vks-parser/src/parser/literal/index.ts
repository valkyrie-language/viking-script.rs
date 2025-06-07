export * from "./parseStringLiteral.ts";
export * from "./parseIdentifier.ts";
export * from "./parseNumberLiteral.ts";

import {LiteralNode} from "viking-hir";
import {choice, Parser} from "@helper";
import {parseBooleanLiteral, parseIdentifier, parseNullLiteral} from "./parseIdentifier.ts";
import {parseStringLiteral} from "./parseStringLiteral.ts";
import {parseNumberLiteral} from "./parseNumberLiteral.ts";

// 通用字面量解析器
export const parseLiteral = choice<LiteralNode>(
    parseNullLiteral,
    parseBooleanLiteral,
    parseIdentifier,
    parseNumberLiteral,
    parseStringLiteral,
)