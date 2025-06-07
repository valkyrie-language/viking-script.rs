import {
    parseNumberLiteral,
    parseStringLiteral,
    parseBooleanLiteral,
    parseNullLiteral,
    parseUndefinedLiteral,
    parseLiteral
} from '../src/parser/literal';

describe('Literal Parsers', () => {
    describe('parseNumberLiteral', () => {
        it('should parse integer literals', () => {
            const result = parseNumberLiteral()('123', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.value).toBe(123);
            expect(result.value?.kind).toBe('Number');
        });
        
        it('should parse floating point literals', () => {
            const result = parseNumberLiteral()('123.45', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.value).toBe(123.45);
        });
        
        it('should parse negative numbers', () => {
            const result = parseNumberLiteral()('-42', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.value).toBe(-42);
        });
        
        it('should parse hexadecimal literals', () => {
            const result = parseNumberLiteral()('0x1A', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.value).toBe(26);
        });
        
        it('should parse binary literals', () => {
            const result = parseNumberLiteral()('0b1010', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.value).toBe(10);
        });
        
        it('should parse octal literals', () => {
            const result = parseNumberLiteral()('0o17', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.value).toBe(15);
        });
        
        it('should parse scientific notation', () => {
            const result = parseNumberLiteral()('1.23e4', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.value).toBe(12300);
        });
        
        it('should fail on invalid numbers', () => {
            expect(parseNumberLiteral()('abc', 0).success).toBe(false);
            expect(parseNumberLiteral()('1.2.3', 0).success).toBe(false);
        });
    });
    
    describe('parseStringLiteral', () => {
        it('should parse double-quoted strings', () => {
            const result = parseStringLiteral()('"hello world"', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.value).toBe('hello world');
            expect(result.value?.kind).toBe('String');
        });
        
        it('should parse single-quoted strings', () => {
            const result = parseStringLiteral()("'hello world'", 0);
            
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
                const result = parseStringLiteral()(input, 0);
                expect(result.success).toBe(true);
                expect(result.value?.value).toBe(expected);
            });
        });
        
        it('should parse template literals', () => {
            const result = parseStringLiteral()('`hello ${name}`', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('Template');
            expect(result.value?.parts).toHaveLength(3); // 'hello ', expression, ''
        });
        
        it('should handle nested template expressions', () => {
            const result = parseStringLiteral()('`outer ${`inner ${x}`} end`', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('Template');
        });
        
        it('should fail on unterminated strings', () => {
            expect(parseStringLiteral()('"unterminated', 0).success).toBe(false);
            expect(parseStringLiteral()("'unterminated", 0).success).toBe(false);
            expect(parseStringLiteral()('`unterminated', 0).success).toBe(false);
        });
    });
    
    describe('parseBooleanLiteral', () => {
        it('should parse true', () => {
            const result = parseBooleanLiteral()('true', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.value).toBe(true);
            expect(result.value?.kind).toBe('Boolean');
        });
        
        it('should parse false', () => {
            const result = parseBooleanLiteral()('false', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.value).toBe(false);
        });
        
        it('should not parse partial matches', () => {
            expect(parseBooleanLiteral()('truthy', 0).success).toBe(false);
            expect(parseBooleanLiteral()('falsy', 0).success).toBe(false);
        });
    });
    
    describe('parseNullLiteral', () => {
        it('should parse null', () => {
            const result = parseNullLiteral()('null', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.value).toBe(null);
            expect(result.value?.kind).toBe('Null');
        });
        
        it('should not parse partial matches', () => {
            expect(parseNullLiteral()('nullable', 0).success).toBe(false);
        });
    });
    
    describe('parseUndefinedLiteral', () => {
        it('should parse undefined', () => {
            const result = parseUndefinedLiteral()('undefined', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.value).toBe(undefined);
            expect(result.value?.kind).toBe('Undefined');
        });
        
        it('should not parse partial matches', () => {
            expect(parseUndefinedLiteral()('undefinedVar', 0).success).toBe(false);
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
                const result = parseLiteral()(input, 0);
                expect(result.success).toBe(true);
                expect(result.value?.kind).toBe(expectedKind);
            });
        });
        
        it('should fail on non-literal input', () => {
            expect(parseLiteral()('variable', 0).success).toBe(false);
            expect(parseLiteral()('function', 0).success).toBe(false);
        });
    });
    
    describe('Complex literals', () => {
        it('should handle whitespace and comments', () => {
            const result = parseNumberLiteral()('  # comment\n  123  ', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.value).toBe(123);
        });
        
        it('should preserve location information', () => {
            const result = parseStringLiteral()('"test"', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.location).toBeDefined();
            expect(result.value?.location?.start.line).toBe(1);
            expect(result.value?.location?.start.column).toBe(1);
        });
        
        it('should handle multiline strings', () => {
            const input = `"line1
            line2
            line3"`;
            const result = parseStringLiteral()(input, 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.value).toContain('line1');
            expect(result.value?.value).toContain('line2');
            expect(result.value?.value).toContain('line3');
        });
    });
    
    describe('Error cases', () => {
        it('should provide meaningful error messages', () => {
            const result = parseNumberLiteral()('abc', 0);
            
            expect(result.success).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].message).toContain('number');
        });
        
        it('should handle unexpected end of input', () => {
            const result = parseStringLiteral()('"incomplete', 0);
            
            expect(result.success).toBe(false);
            expect(result.errors[0].message).toContain('unterminated');
        });
        
        it('should handle invalid escape sequences', () => {
            const result = parseStringLiteral()('"invalid\\x"', 0);
            
            expect(result.success).toBe(false);
            expect(result.errors[0].message).toContain('escape');
        });
    });
});