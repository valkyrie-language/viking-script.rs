import {
    parseIdentifierPattern,
    parseLiteralPattern,
    parseWildcardPattern,
    parseArrayPattern,
    parseObjectPattern,
    parseRestPattern,
    parseTypePattern,
    parseConditionPattern,
    parseDestructurePattern,
    parseGuardPattern,
    parseRangePattern,
    parsePattern
} from '../src/parser/pattern';

describe('Pattern Parsers', () => {
    describe('parseIdentifierPattern', () => {
        it('should parse simple identifier patterns', () => {
            const result = parseIdentifierPattern()('x', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('IdentifierPattern');
            expect(result.value?.name).toBe('x');
        });
        
        it('should parse qualified identifier patterns', () => {
            const result = parseIdentifierPattern()('Module.Type', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.name).toBe('Module.Type');
        });
        
        it('should not parse keywords as identifiers', () => {
            const keywords = ['let', 'const', 'function', 'class', 'if', 'else'];
            
            keywords.forEach(keyword => {
                const result = parseIdentifierPattern()(keyword, 0);
                expect(result.success).toBe(false);
            });
        });
    });
    
    describe('parseLiteralPattern', () => {
        it('should parse number literal patterns', () => {
            const testCases = ['42', '3.14', '-10', '0xFF', '0b1010', '1e5'];
            
            testCases.forEach(input => {
                const result = parseLiteralPattern()(input, 0);
                expect(result.success).toBe(true);
                expect(result.value?.kind).toBe('LiteralPattern');
            });
        });
        
        it('should parse string literal patterns', () => {
            const testCases = [
                '"hello"',
                "'world'",
                '"escaped \"quotes\""',
                '`template ${"literal"}`'
            ];
            
            testCases.forEach(input => {
                const result = parseLiteralPattern()(input, 0);
                expect(result.success).toBe(true);
                expect(result.value?.kind).toBe('LiteralPattern');
            });
        });
        
        it('should parse boolean literal patterns', () => {
            const testCases = ['true', 'false'];
            
            testCases.forEach(input => {
                const result = parseLiteralPattern()(input, 0);
                expect(result.success).toBe(true);
                expect(result.value?.kind).toBe('LiteralPattern');
                expect(result.value?.value).toBe(input === 'true');
            });
        });
        
        it('should parse null and undefined patterns', () => {
            const testCases = ['null', 'undefined'];
            
            testCases.forEach(input => {
                const result = parseLiteralPattern()(input, 0);
                expect(result.success).toBe(true);
                expect(result.value?.kind).toBe('LiteralPattern');
            });
        });
    });
    
    describe('parseWildcardPattern', () => {
        it('should parse wildcard patterns', () => {
            const result = parseWildcardPattern()('_', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('WildcardPattern');
        });
        
        it('should not parse other identifiers as wildcards', () => {
            const result = parseWildcardPattern()('x', 0);
            expect(result.success).toBe(false);
        });
    });
    
    describe('parseArrayPattern', () => {
        it('should parse empty array patterns', () => {
            const result = parseArrayPattern()('[]', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('ArrayPattern');
            expect(result.value?.elements).toHaveLength(0);
        });
        
        it('should parse simple array patterns', () => {
            const result = parseArrayPattern()('[a, b, c]', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.elements).toHaveLength(3);
            expect(result.value?.elements[0].kind).toBe('IdentifierPattern');
        });
        
        it('should parse array patterns with wildcards', () => {
            const result = parseArrayPattern()('[a, _, c]', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.elements[1].kind).toBe('WildcardPattern');
        });
        
        it('should parse array patterns with rest elements', () => {
            const result = parseArrayPattern()('[first, ...rest]', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.elements).toHaveLength(2);
            expect(result.value?.elements[1].kind).toBe('RestPattern');
        });
        
        it('should parse nested array patterns', () => {
            const result = parseArrayPattern()('[a, [b, c], d]', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.elements[1].kind).toBe('ArrayPattern');
        });
        
        it('should handle trailing commas', () => {
            const result = parseArrayPattern()('[a, b, c,]', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.elements).toHaveLength(3);
        });
        
        it('should parse sparse array patterns', () => {
            const result = parseArrayPattern()('[a, , c]', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.elements).toHaveLength(3);
            expect(result.value?.elements[1]).toBeUndefined();
        });
    });
    
    describe('parseObjectPattern', () => {
        it('should parse empty object patterns', () => {
            const result = parseObjectPattern()('{}', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('ObjectPattern');
            expect(result.value?.properties).toHaveLength(0);
        });
        
        it('should parse simple object patterns', () => {
            const result = parseObjectPattern()('{ name, age }', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.properties).toHaveLength(2);
            expect(result.value?.properties[0].key).toBe('name');
            expect(result.value?.properties[0].value.kind).toBe('IdentifierPattern');
        });
        
        it('should parse object patterns with renaming', () => {
            const result = parseObjectPattern()('{ name: n, age: a }', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.properties[0].key).toBe('name');
            expect(result.value?.properties[0].value.name).toBe('n');
        });
        
        it('should parse object patterns with nested patterns', () => {
            const result = parseObjectPattern()('{ person: { name, age } }', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.properties[0].value.kind).toBe('ObjectPattern');
        });
        
        it('should parse object patterns with computed properties', () => {
            const result = parseObjectPattern()('{ [key]: value }', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.properties[0].computed).toBe(true);
        });
        
        it('should parse object patterns with rest properties', () => {
            const result = parseObjectPattern()('{ name, ...rest }', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.properties).toHaveLength(2);
            expect(result.value?.properties[1].kind).toBe('RestPattern');
        });
        
        it('should handle trailing commas', () => {
            const result = parseObjectPattern()('{ name, age, }', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.properties).toHaveLength(2);
        });
    });
    
    describe('parseRestPattern', () => {
        it('should parse simple rest patterns', () => {
            const result = parseRestPattern()('...rest', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('RestPattern');
            expect(result.value?.pattern.name).toBe('rest');
        });
        
        it('should parse rest patterns with nested patterns', () => {
            const result = parseRestPattern()('...{name, age}', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.pattern.kind).toBe('ObjectPattern');
        });
        
        it('should parse rest patterns with wildcards', () => {
            const result = parseRestPattern()('..._', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.pattern.kind).toBe('WildcardPattern');
        });
    });
    
    describe('parseTypePattern', () => {
        it('should parse simple type patterns', () => {
            const result = parseTypePattern()('x: string', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('TypePattern');
            expect(result.value?.pattern.name).toBe('x');
            expect(result.value?.typeAnnotation.kind).toBe('PrimitiveType');
        });
        
        it('should parse type patterns with complex types', () => {
            const result = parseTypePattern()('data: Array<string | number>', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.typeAnnotation.kind).toBe('GenericType');
        });
        
        it('should parse type patterns with nested patterns', () => {
            const result = parseTypePattern()('[a, b]: [string, number]', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.pattern.kind).toBe('ArrayPattern');
            expect(result.value?.typeAnnotation.kind).toBe('TupleType');
        });
    });
    
    describe('parseConditionPattern', () => {
        it('should parse simple condition patterns', () => {
            const result = parseConditionPattern()('x > 0', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('ConditionPattern');
            expect(result.value?.condition.kind).toBe('BinaryExpression');
        });
        
        it('should parse complex condition patterns', () => {
            const result = parseConditionPattern()('x > 0 && x < 100', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.condition.operator).toBe('&&');
        });
        
        it('should parse condition patterns with function calls', () => {
            const result = parseConditionPattern()('isValid(x)', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.condition.kind).toBe('CallExpression');
        });
    });
    
    describe('parseGuardPattern', () => {
        it('should parse guard patterns with if', () => {
            const result = parseGuardPattern()('x if x > 0', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('GuardPattern');
            expect(result.value?.pattern.name).toBe('x');
            expect(result.value?.guard.kind).toBe('BinaryExpression');
        });
        
        it('should parse guard patterns with complex patterns', () => {
            const result = parseGuardPattern()('[a, b] if a + b > 10', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.pattern.kind).toBe('ArrayPattern');
        });
        
        it('should parse guard patterns with type annotations', () => {
            const result = parseGuardPattern()('x: number if x > 0', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.pattern.kind).toBe('TypePattern');
        });
    });
    
    describe('parseRangePattern', () => {
        it('should parse inclusive range patterns', () => {
            const result = parseRangePattern()('1..10', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('RangePattern');
            expect(result.value?.start.value).toBe(1);
            expect(result.value?.end.value).toBe(10);
            expect(result.value?.inclusive).toBe(true);
        });
        
        it('should parse exclusive range patterns', () => {
            const result = parseRangePattern()('1...10', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.inclusive).toBe(false);
        });
        
        it('should parse range patterns with expressions', () => {
            const result = parseRangePattern()('min..max', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.start.kind).toBe('Identifier');
            expect(result.value?.end.kind).toBe('Identifier');
        });
        
        it('should parse open-ended ranges', () => {
            const testCases = [
                ['1..', true, undefined],
                ['..10', undefined, true],
                ['1...', false, undefined],
                ['...10', undefined, false]
            ];
            
            testCases.forEach(([input, startInclusive, endInclusive]) => {
                const result = parseRangePattern()(input, 0);
                expect(result.success).toBe(true);
                if (startInclusive !== undefined) {
                    expect(result.value?.start).toBeDefined();
                    expect(result.value?.end).toBeUndefined();
                }
                if (endInclusive !== undefined) {
                    expect(result.value?.start).toBeUndefined();
                    expect(result.value?.end).toBeDefined();
                }
            });
        });
    });
    
    describe('parseDestructurePattern', () => {
        it('should parse simple destructuring patterns', () => {
            const result = parseDestructurePattern()('Student { name, age }', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('DestructurePattern');
            expect(result.value?.type.name).toBe('Student');
            expect(result.value?.pattern.kind).toBe('ObjectPattern');
        });
        
        it('should parse destructuring with renaming', () => {
            const result = parseDestructurePattern()('Person { name: n, age: a }', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.pattern.properties[0].key).toBe('name');
            expect(result.value?.pattern.properties[0].value.name).toBe('n');
        });
        
        it('should parse nested destructuring patterns', () => {
            const result = parseDestructurePattern()('Company { address: { street, city } }', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.pattern.properties[0].value.kind).toBe('ObjectPattern');
        });
        
        it('should parse destructuring with rest patterns', () => {
            const result = parseDestructurePattern()('Person { name, ...rest }', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.pattern.properties[1].kind).toBe('RestPattern');
        });
    });
    
    describe('Complex pattern combinations', () => {
        it('should parse patterns with type assertions and conditions', () => {
            const result = parsePattern()('type Student if age > 10', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('GuardPattern');
            expect(result.value?.pattern.kind).toBe('TypePattern');
        });
        
        it('should parse nested destructuring with guards', () => {
            const result = parsePattern()('Person { address: { city } } if city === "NYC"', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('GuardPattern');
            expect(result.value?.pattern.kind).toBe('DestructurePattern');
        });
        
        it('should parse array patterns with type annotations', () => {
            const result = parsePattern()('[a, b]: [string, number]', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('TypePattern');
            expect(result.value?.pattern.kind).toBe('ArrayPattern');
        });
        
        it('should parse range patterns in arrays', () => {
            const result = parsePattern()('[1..5, x]', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('ArrayPattern');
            expect(result.value?.elements[0].kind).toBe('RangePattern');
        });
    });
    
    describe('Viking-specific patterns', () => {
        it('should parse "self is Type" patterns', () => {
            const result = parsePattern()('self is Student', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('TypePattern');
            expect(result.value?.pattern.name).toBe('self');
        });
        
        it('should parse fallthrough patterns', () => {
            const result = parsePattern()('case x > 0: print("positive"); fallthrough!', 0);
            
            expect(result.success).toBe(true);
            // This would be handled at the statement level, not pattern level
        });
        
        it('should parse union variant patterns', () => {
            const result = parsePattern()('Student { name, grade }', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('DestructurePattern');
            expect(result.value?.type.name).toBe('Student');
        });
    });
    
    describe('Error handling', () => {
        it('should handle syntax errors in patterns', () => {
            const result = parsePattern()('[a, b,', 0);
            
            expect(result.success).toBe(false);
            expect(result.errors).toHaveLength(1);
        });
        
        it('should handle mismatched brackets', () => {
            const result = parsePattern()('{ name, age', 0);
            
            expect(result.success).toBe(false);
            expect(result.errors[0].message).toContain('}');
        });
        
        it('should handle invalid destructuring syntax', () => {
            const result = parsePattern()('Type {', 0);
            
            expect(result.success).toBe(false);
        });
        
        it('should handle invalid range syntax', () => {
            const result = parsePattern()('1..', 0);
            
            // This should actually succeed for open-ended ranges
            expect(result.success).toBe(true);
        });
    });
    
    describe('Location tracking', () => {
        it('should track locations for simple patterns', () => {
            const result = parsePattern()('x', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.location).toBeDefined();
            expect(result.value?.location.start.line).toBe(1);
            expect(result.value?.location.start.column).toBe(1);
        });
        
        it('should track locations for complex patterns', () => {
            const result = parsePattern()('{ name, age }', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.location).toBeDefined();
            expect(result.value?.properties[0].location).toBeDefined();
        });
        
        it('should track locations across multiple lines', () => {
            const input = `{
  name,
  age
}`;
            
            const result = parsePattern()(input, 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.location.end.line).toBeGreaterThan(1);
        });
    });
    
    describe('Whitespace and comments', () => {
        it('should handle whitespace in patterns', () => {
            const result = parsePattern()('  { name , age }  ', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('ObjectPattern');
        });
        
        it('should handle comments in patterns', () => {
            const input = `{
  name, # first name
  age   # age in years
}`;
            
            const result = parsePattern()(input, 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.properties).toHaveLength(2);
        });
        
        it('should handle multiline comments', () => {
            const input = `{
  name, <# this is
         a multiline comment #>
  age
}`;
            
            const result = parsePattern()(input, 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.properties).toHaveLength(2);
        });
    });
});