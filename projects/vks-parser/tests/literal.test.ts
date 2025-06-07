import {
    parseBooleanLiteral,
    parseIdentifier,
    parseNullLiteral,
    parseNumberLiteral,
    parseStringLiteral,
    parseLiteral
} from '@parser/literal';

import {ParseState} from "@helper";

describe('字面量解析', () => {
    describe('关键词解析', () => {
        it('null', () => {
            const result = parseNullLiteral(new ParseState('null'));
            expect(result.success).toBe(true);
            expect(result.value.type).toBe('NullLiteral');
        });

        it('true', () => {
            const result = parseBooleanLiteral(new ParseState('true'));

            expect(result.success).toBe(true);
            expect(result.value?.value).toBe(true);
            expect(result.value?.type).toBe('BooleanLiteral');
        });

        it('false', () => {
            const result = parseBooleanLiteral(new ParseState('false'));

            expect(result.success).toBe(true);
            expect(result.value?.value).toBe(false);
        });

        it('非关键词', () => {
            expect(parseNullLiteral(new ParseState('nullable')).success).toBe(false);
            expect(parseBooleanLiteral(new ParseState('truthy')).success).toBe(false);
            expect(parseBooleanLiteral(new ParseState('falsy')).success).toBe(false);
        });
    });

    describe('标识符解析', () => {
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

        it('Unicode 标识符', () => {
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
    describe('数字解析', () => {
        it('should parse integer literals', () => {
            const state = new ParseState('123');
            const result = parseNumberLiteral(state);

            expect(result.success).toBe(true);
            expect(result.value?.value).toBe(123);
            expect(result.value?.type).toBe('NumberLiteral');
        });

        it('should parse floating point literals', () => {
            const result = parseNumberLiteral(new ParseState('123.45'));

            expect(result.success).toBe(true);
            expect(result.value?.value).toBe(123.45);
        });

        it('should not parse negative numbers', () => {
            const result = parseNumberLiteral(new ParseState('-42'));

            expect(result.success).toBe(false);
        });

        it('should parse hexadecimal literals', () => {
            const result = parseNumberLiteral(new ParseState('0x1A'));

            expect(result.success).toBe(true);
            expect(result.value?.value).toBe(0);
        });

        it('should parse binary literals', () => {
            const result = parseNumberLiteral(new ParseState('0b1010'));

            expect(result.success).toBe(true);
            expect(result.value?.value).toBe(0);
        });

        it('should parse octal literals', () => {
            const result = parseNumberLiteral(new ParseState('0o17'));

            expect(result.success).toBe(true);
            expect(result.value?.value).toBe(0);
        });

        it('should parse scientific notation', () => {
            const result = parseNumberLiteral(new ParseState('1.23e4'));

            expect(result.success).toBe(true);
            expect(result.value?.value).toBe(12300);
        });
    });

    describe('字符串解析', () => {
        it('空字符串', () => {
            const result = parseStringLiteral(new ParseState("''"));

            expect(result.success).toBe(true);
            expect(result.value?.text).toBe('');
            expect(result.value?.type).toBe('StringLiteral');
        });

        it('单引号', () => {
            const result = parseStringLiteral(new ParseState("'hello world'"));

            expect(result.success).toBe(true);
            expect(result.value?.text).toBe('hello world');
            expect(result.value?.type).toBe('StringLiteral');
        });

        it('双引号', () => {
            const result = parseStringLiteral(new ParseState('"hello world"'));

            expect(result.success).toBe(true);
            expect(result.value?.text).toBe('hello world');
            expect(result.value?.type).toBe('StringLiteral');
        });

        it('多行字符串', () => {
            const result = parseStringLiteral(new ParseState("'''3'''"));

            expect(result.success).toBe(true);
            expect(result.value?.text).toBe('3');
            expect(result.value?.type).toBe('StringLiteral');
        });
    });

    describe('混合解析', () => {
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
                const result = parseLiteral(new ParseState(input));
                console.log(input, result)
                expect(result.success).toBe(true);
                expect(result.value?.type).toBe(expectedKind);
            });
        });
    });

    describe('Complex literals', () => {
        it('should handle whitespace and comments', () => {
            const result = parseNumberLiteral(new ParseState('  # comment\n  123  '));

            expect(result.success).toBe(true);
            expect(result.value?.value).toBe(123);
        });

        it('should preserve location information', () => {
            const result = parseStringLiteral(new ParseState('"test"'));

            expect(result.success).toBe(true);
            expect(result.value?.location).toBeDefined();
            expect(result.value?.location?.start.line).toBe(1);
            expect(result.value?.location?.start.column).toBe(1);
        });

        it('should handle multiline strings', () => {
            const input = `"line1
            line2
            line3"`;
            const result = parseStringLiteral(new ParseState(input));

            expect(result.success).toBe(true);
            expect(result.value?.value).toContain('line1');
            expect(result.value?.value).toContain('line2');
            expect(result.value?.value).toContain('line3');
        });
    });
});