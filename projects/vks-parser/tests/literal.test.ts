import {
    parseBooleanLiteral, parseIdentifier,
    parseLiteral,
    parseNullLiteral,
    parseNumberLiteral,
    parseUndefinedLiteral
} from '../src/parser/literal';
import {ParseState} from "../src"
import {parseStringLiteral} from "../src/parser/literal/parseStringLiteral";

describe('Literal Parsers', () => {
    describe('parseNumberLiteral', () => {
        it('should parse integer literals', () => {
            const state = new ParseState('123');
            const result = parseNumberLiteral()(state);

            expect(result.success).toBe(true);
            expect(result.value?.value).toBe(123);
            expect(result.value?.type).toBe('NumberLiteral');
        });

        it('should parse floating point literals', () => {
            const result = parseNumberLiteral()(new ParseState('123.45'));

            expect(result.success).toBe(true);
            expect(result.value?.value).toBe(123.45);
        });

        it('should not parse negative numbers', () => {
            const result = parseNumberLiteral()(new ParseState('-42'));

            expect(result.success).toBe(false);
        });

        it('should parse hexadecimal literals', () => {
            const result = parseNumberLiteral()(new ParseState('0x1A'));

            expect(result.success).toBe(true);
            expect(result.value?.value).toBe(26);
        });

        it('should parse binary literals', () => {
            const result = parseNumberLiteral()(new ParseState('0b1010'));

            expect(result.success).toBe(true);
            expect(result.value?.value).toBe(10);
        });

        it('should parse octal literals', () => {
            const result = parseNumberLiteral()(new ParseState('0o17'));

            expect(result.success).toBe(true);
            expect(result.value?.value).toBe(15);
        });

        it('should parse scientific notation', () => {
            const result = parseNumberLiteral()(new ParseState('1.23e4'));

            expect(result.success).toBe(true);
            expect(result.value?.value).toBe(12300);
        });

        it('should fail on invalid numbers', () => {
            expect(parseNumberLiteral()(new ParseState('abc')).success).toBe(false);
            expect(parseNumberLiteral()(new ParseState('1.2.3')).success).toBe(false);
        });
    });

    describe('parseStringLiteral', () => {
        it('should parse double-quoted strings', () => {
            const result = parseStringLiteral()(new ParseState('"hello world"'));

            expect(result.success).toBe(true);
            expect(result.value?.value).toBe('hello world');
            expect(result.value?.kind).toBe('String');
        });

        it('should parse single-quoted strings', () => {
            const result = parseStringLiteral()(new ParseState("'hello world'"));

            expect(result.success).toBe(true);
            expect(result.value?.value).toBe('hello world');
        });

        it('should handle escape sequences', () => {
            const testCases = [
                ['"hello\\nworld"', 'hello\nworld'],
                ['"tab\\there"', 'tab\there'],
                ['"quote\\"here"', 'quote"here'],
                ['"backslash\\\\here"', 'backslash\\here'],
                ['"unicode\\u0041"', 'unicodeA']
            ];

            testCases.forEach(([input, expected]) => {
                const result = parseStringLiteral()(new ParseState(input));
                expect(result.success).toBe(true);
                expect(result.value?.value).toBe(expected);
            });
        });

        it('should parse template literals', () => {
            const result = parseStringLiteral()(new ParseState('`hello ${name}`'));

            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('Template');
            expect(result.value?.parts).toHaveLength(3); // 'hello ', expression, ''
        });

        it('should handle nested template expressions', () => {
            const result = parseStringLiteral()(new ParseState('`outer ${`inner ${x}`} end`'));

            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('Template');
        });

        it('should fail on unterminated strings', () => {
            expect(parseStringLiteral()(new ParseState('"unterminated')).success).toBe(false);
            expect(parseStringLiteral()(new ParseState("'unterminated")).success).toBe(false);
            expect(parseStringLiteral()(new ParseState('`unterminated')).success).toBe(false);
        });
    });

    describe('parseBooleanLiteral', () => {
        it('should parse true', () => {
            const result = parseBooleanLiteral(new ParseState('true'));

            expect(result.success).toBe(true);
            expect(result.value?.value).toBe(true);
            expect(result.value?.type).toBe('BooleanLiteral');
        });

        it('should parse false', () => {
            const result = parseBooleanLiteral(new ParseState('false'));

            expect(result.success).toBe(true);
            expect(result.value?.value).toBe(false);
        });

        it('should not parse partial matches', () => {
            expect(parseBooleanLiteral(new ParseState('truthy')).success).toBe(false);
            expect(parseBooleanLiteral(new ParseState('falsy')).success).toBe(false);
        });
    });

    describe('parseNullLiteral', () => {
        it('should parse null', () => {
            const result = parseNullLiteral(new ParseState('null'));
            expect(result.success).toBe(true);
            expect(result.value.type).toBe('NullLiteral');
        });

        it('should not parse partial matches', () => {
            expect(parseNullLiteral(new ParseState('nullable')).success).toBe(false);
        });
    });

    describe('解析标识符', () => {
        it('下划线标识符', () => {
            const result = parseIdentifier(new ParseState('_'));

            expect(result.success).toBe(true);
            expect(result.value?.value).toBe('_');
            expect(result.value?.type).toBe('IdentifierLiteral');
        });

        it('单字母标识符', () => {
            const result = parseIdentifier(new ParseState('a::b.c()'));

            expect(result.success).toBe(true);
            expect(result.value?.value).toBe('a');
            expect(result.value?.type).toBe('IdentifierLiteral');
        });

        it('多字母标识符', () => {
            const result = parseIdentifier(new ParseState('abc123+456'));

            expect(result.success).toBe(true);
            expect(result.value?.value).toBe('abc123');
            expect(result.value?.type).toBe('IdentifierLiteral');
        });

        it('Unicode', () => {
            const result = parseIdentifier(new ParseState('Halló世界'));

            expect(result.success).toBe(true);
            expect(result.value?.value).toBe('Halló世界');
            expect(result.value?.type).toBe('IdentifierLiteral');
        });

        it('纯数字', () => {
            const result = parseIdentifier(new ParseState('123'));
            expect(result.success).toBe(false);
        });

        it('空一格', () => {
            const result = parseIdentifier(new ParseState(' abc'));
            expect(result.success).toBe(false);
        });

    });

    describe('parseLiteral', () => {
        it('should parse any literal type', () => {
            const testCases = [
                ['123', 'Number'],
                ['"hello"', 'String'],
                ['true', 'Boolean'],
                ['false', 'Boolean'],
                ['null', 'Null'],
                ['undefined', 'Undefined']
            ];

            testCases.forEach(([input, expectedKind]) => {
                const result = parseLiteral()(new ParseState(input));
                expect(result.success).toBe(true);
                expect(result.value?.kind).toBe(expectedKind);
            });
        });

        it('should fail on non-literal input', () => {
            expect(parseLiteral()(new ParseState('variable')).success).toBe(false);
            expect(parseLiteral()(new ParseState('function')).success).toBe(false);
        });
    });

    describe('Complex literals', () => {
        it('should handle whitespace and comments', () => {
            const result = parseNumberLiteral()(new ParseState('  # comment\n  123  '));

            expect(result.success).toBe(true);
            expect(result.value?.value).toBe(123);
        });

        it('should preserve location information', () => {
            const result = parseStringLiteral()(new ParseState('"test"'));

            expect(result.success).toBe(true);
            expect(result.value?.location).toBeDefined();
            expect(result.value?.location?.start.line).toBe(1);
            expect(result.value?.location?.start.column).toBe(1);
        });

        it('should handle multiline strings', () => {
            const input = `"line1
            line2
            line3"`;
            const result = parseStringLiteral()(new ParseState(input));

            expect(result.success).toBe(true);
            expect(result.value?.value).toContain('line1');
            expect(result.value?.value).toContain('line2');
            expect(result.value?.value).toContain('line3');
        });
    });
});