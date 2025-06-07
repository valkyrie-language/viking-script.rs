import {parseExpression, parseNamepath} from '@parser/expression';
import {ParseState} from "viking-hir";

describe('Expression Parsers', () => {
    describe('parseIdentifier', () => {
        it('should parse simple identifiers', () => {
            const result = parseNamepath()(new ParseState('variable'));

            expect(result.success).toBe(true);
            expect(result.value?.name).toBe('variable');
            expect(result.value?.kind).toBe('Identifier');
        });

        it('should parse identifiers with underscores', () => {
            const result = parseNamepath()('_private_var', 0);

            expect(result.success).toBe(true);
            expect(result.value?.name).toBe('_private_var');
        });

        it('should parse identifiers with numbers', () => {
            const result = parseNamepath()('var123', 0);

            expect(result.success).toBe(true);
            expect(result.value?.name).toBe('var123');
        });

        it('should fail on keywords', () => {
            expect(parseNamepath()('let', 0).success).toBe(false);
            expect(parseNamepath()('function', 0).success).toBe(false);
            expect(parseNamepath()('class', 0).success).toBe(false);
        });

        it('should fail on numbers starting identifiers', () => {
            expect(parseNamepath()('123var', 0).success).toBe(false);
        });
    });

    describe('parseBinaryExpression', () => {
        it('should parse arithmetic expressions', () => {
            const testCases = [
                ['1 + 2', '+'],
                ['a - b', '-'],
                ['x * y', '*'],
                ['a / b', '/'],
                ['x % y', '%']
            ];

            testCases.forEach(([input, expectedOp]) => {
                const result = parseExpression()(input, 0);
                expect(result.success).toBe(true);
                expect(result.value?.kind).toBe('BinaryExpression');
                expect(result.value?.operator).toBe(expectedOp);
            });
        });

        it('should parse comparison expressions', () => {
            const testCases = [
                ['a == b', '=='],
                ['a != b', '!='],
                ['a < b', '<'],
                ['a > b', '>'],
                ['a <= b', '<='],
                ['a >= b', '>=']
            ];

            testCases.forEach(([input, expectedOp]) => {
                const result = parseExpression()(input, 0);
                expect(result.success).toBe(true);
                expect(result.value?.operator).toBe(expectedOp);
            });
        });

        it('should parse logical expressions', () => {
            const testCases = [
                ['a && b', '&&'],
                ['a || b', '||'],
                ['a ?? b', '??']
            ];

            testCases.forEach(([input, expectedOp]) => {
                const result = parseExpression()(input, 0);
                expect(result.success).toBe(true);
                expect(result.value?.operator).toBe(expectedOp);
            });
        });

        it('should handle operator precedence', () => {
            const result = parseExpression()('1 + 2 * 3', 0);

            expect(result.success).toBe(true);
            // Should parse as 1 + (2 * 3)
            expect(result.value?.kind).toBe('BinaryExpression');
            expect(result.value?.operator).toBe('+');
            expect(result.value?.right.kind).toBe('BinaryExpression');
            expect(result.value?.right.operator).toBe('*');
        });

        it('should handle left associativity', () => {
            const result = parseExpression()('1 - 2 - 3', 0);

            expect(result.success).toBe(true);
            // Should parse as (1 - 2) - 3
            expect(result.value?.kind).toBe('BinaryExpression');
            expect(result.value?.operator).toBe('-');
            expect(result.value?.left.kind).toBe('BinaryExpression');
            expect(result.value?.left.operator).toBe('-');
        });

        it('should handle parentheses', () => {
            const result = parseExpression()('(1 + 2) * 3', 0);

            expect(result.success).toBe(true);
            expect(result.value?.operator).toBe('*');
            expect(result.value?.left.kind).toBe('BinaryExpression');
            expect(result.value?.left.operator).toBe('+');
        });
    });

    describe('parseUnaryExpression', () => {
        it('should parse unary operators', () => {
            const testCases = [
                ['-x', '-'],
                ['+x', '+'],
                ['!x', '!'],
                ['~x', '~']
            ];

            testCases.forEach(([input, expectedOp]) => {
                const result = parseExpression()(input, 0);
                expect(result.success).toBe(true);
                expect(result.value?.kind).toBe('UnaryExpression');
                expect(result.value?.operator).toBe(expectedOp);
            });
        });

        it('should handle multiple unary operators', () => {
            const result = parseExpression()('!!x', 0);

            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('UnaryExpression');
            expect(result.value?.operator).toBe('!');
            expect(result.value?.operand.kind).toBe('UnaryExpression');
            expect(result.value?.operand.operator).toBe('!');
        });

        it('should handle postfix operators', () => {
            const testCases = [
                ['x++', '++'],
                ['x--', '--']
            ];

            testCases.forEach(([input, expectedOp]) => {
                const result = parseExpression()(input, 0);
                expect(result.success).toBe(true);
                expect(result.value?.kind).toBe('UpdateExpression');
                expect(result.value?.operator).toBe(expectedOp);
                expect(result.value?.prefix).toBe(false);
            });
        });

        it('should handle prefix operators', () => {
            const testCases = [
                ['++x', '++'],
                ['--x', '--']
            ];

            testCases.forEach(([input, expectedOp]) => {
                const result = parseExpression()(input, 0);
                expect(result.success).toBe(true);
                expect(result.value?.kind).toBe('UpdateExpression');
                expect(result.value?.operator).toBe(expectedOp);
                expect(result.value?.prefix).toBe(true);
            });
        });
    });

    describe('parseFunctionCall', () => {
        it('should parse function calls with no arguments', () => {
            const result = parseExpression()('func()', 0);

            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('CallExpression');
            expect(result.value?.callee.name).toBe('func');
            expect(result.value?.arguments).toHaveLength(0);
        });

        it('should parse function calls with arguments', () => {
            const result = parseExpression()('func(a, b, 123)', 0);

            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('CallExpression');
            expect(result.value?.arguments).toHaveLength(3);
        });

        it('should parse method calls', () => {
            const result = parseExpression()('obj.method()', 0);

            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('CallExpression');
            expect(result.value?.callee.kind).toBe('MemberExpression');
        });

        it('should parse chained calls', () => {
            const result = parseExpression()('obj.method1().method2()', 0);

            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('CallExpression');
        });

        it('should handle trailing commas', () => {
            const result = parseExpression()('func(a, b,)', 0);

            expect(result.success).toBe(true);
            expect(result.value?.arguments).toHaveLength(2);
        });
    });

    describe('parseArrayLiteral', () => {
        it('should parse empty arrays', () => {
            const result = parseExpression()('[]', 0);

            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('ArrayExpression');
            expect(result.value?.elements).toHaveLength(0);
        });

        it('should parse arrays with elements', () => {
            const result = parseExpression()('[1, 2, 3]', 0);

            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('ArrayExpression');
            expect(result.value?.elements).toHaveLength(3);
        });

        it('should parse nested arrays', () => {
            const result = parseExpression()('[[1, 2], [3, 4]]', 0);

            expect(result.success).toBe(true);
            expect(result.value?.elements).toHaveLength(2);
            expect(result.value?.elements[0].kind).toBe('ArrayExpression');
        });

        it('should handle trailing commas', () => {
            const result = parseExpression()('[1, 2, 3,]', 0);

            expect(result.success).toBe(true);
            expect(result.value?.elements).toHaveLength(3);
        });

        it('should handle sparse arrays', () => {
            const result = parseExpression()('[1, , 3]', 0);

            expect(result.success).toBe(true);
            expect(result.value?.elements).toHaveLength(3);
            expect(result.value?.elements[1]).toBeNull();
        });
    });

    describe('parseObjectLiteral', () => {
        it('should parse empty objects', () => {
            const result = parseExpression()('{}', 0);

            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('ObjectExpression');
            expect(result.value?.properties).toHaveLength(0);
        });

        it('should parse objects with properties', () => {
            const result = parseExpression()('{a: 1, b: 2}', 0);

            expect(result.success).toBe(true);
            expect(result.value?.properties).toHaveLength(2);
        });

        it('should parse computed property names', () => {
            const result = parseExpression()('{[key]: value}', 0);

            expect(result.success).toBe(true);
            expect(result.value?.properties[0].computed).toBe(true);
        });

        it('should parse shorthand properties', () => {
            const result = parseExpression()('{a, b}', 0);

            expect(result.success).toBe(true);
            expect(result.value?.properties).toHaveLength(2);
            expect(result.value?.properties[0].shorthand).toBe(true);
        });

        it('should parse method definitions', () => {
            const result = parseExpression()('{method() { return 1; }}', 0);

            expect(result.success).toBe(true);
            expect(result.value?.properties[0].method).toBe(true);
        });

        it('should handle trailing commas', () => {
            const result = parseExpression()('{a: 1, b: 2,}', 0);

            expect(result.success).toBe(true);
            expect(result.value?.properties).toHaveLength(2);
        });
    });

    describe('Complex expressions', () => {
        it('should parse member access', () => {
            const result = parseExpression()('obj.prop', 0);

            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('MemberExpression');
            expect(result.value?.computed).toBe(false);
        });

        it('should parse computed member access', () => {
            const result = parseExpression()('obj[key]', 0);

            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('MemberExpression');
            expect(result.value?.computed).toBe(true);
        });

        it('should parse conditional expressions', () => {
            const result = parseExpression()('a ? b : c', 0);

            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('ConditionalExpression');
        });

        it('should parse async/await expressions', () => {
            const result = parseExpression()('await promise', 0);

            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('AwaitExpression');
        });

        it('should parse yield expressions', () => {
            const result = parseExpression()('yield value', 0);

            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('YieldExpression');
        });

        it('should parse yield from expressions', () => {
            const result = parseExpression()('yield from generator', 0);

            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('YieldExpression');
            expect(result.value?.delegate).toBe(true);
        });
    });

    describe('Error handling', () => {
        it('should handle syntax errors gracefully', () => {
            const result = parseExpression()('1 +', 0);

            expect(result.success).toBe(false);
            expect(result.errors).toHaveLength(1);
        });

        it('should handle mismatched parentheses', () => {
            const result = parseExpression()('(1 + 2', 0);

            expect(result.success).toBe(false);
            expect(result.errors[0].message).toContain(')');
        });

        it('should handle invalid property access', () => {
            const result = parseExpression()('obj.', 0);

            expect(result.success).toBe(false);
        });
    });

    describe('Location tracking', () => {
        it('should track location information', () => {
            const result = parseExpression()('variable', 0);

            expect(result.success).toBe(true);
            expect(result.value?.location).toBeDefined();
            expect(result.value?.location?.start.line).toBe(1);
            expect(result.value?.location?.start.column).toBe(1);
        });

        it('should handle multiline expressions', () => {
            const input = `{
  a: 1,
  b: 2
}`;
            const result = parseExpression()(input, 0);

            expect(result.success).toBe(true);
            expect(result.value?.location?.end.line).toBe(4);
        });
    });
});