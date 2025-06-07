import {
    matchString,
    matchRegex,
    sequence,
    choice,
    optional,
    repeats,
    many1,
    map,
    sepBy,
    sepBy1,
    keyword,
    identifier,
    number,
    stringLiteral,
    boolean,
    operator,
    symbol,
    skipWhitespace,
    skipComments,
    withIgnore
} from '../src/helper';

describe('Parser Combinators', () => {
    describe('matchString', () => {
        it('should match exact strings', () => {
            const parser = matchString('hello');
            const result = parser('hello world', 0);
            
            expect(result.success).toBe(true);
            expect(result.value).toBe('hello');
            expect(result.position).toBe(5);
        });
        
        it('should fail on non-matching strings', () => {
            const parser = matchString('hello');
            const result = parser('hi world', 0);
            
            expect(result.success).toBe(false);
            expect(result.errors).toHaveLength(1);
        });
    });
    
    describe('matchRegex', () => {
        it('should match regex patterns', () => {
            const parser = matchRegex(/^\d+/, 'number');
            const result = parser('123abc', 0);
            
            expect(result.success).toBe(true);
            expect(result.value).toBe('123');
            expect(result.position).toBe(3);
        });
        
        it('should fail on non-matching patterns', () => {
            const parser = matchRegex(/^\d+/, 'number');
            const result = parser('abc123', 0);
            
            expect(result.success).toBe(false);
        });
    });
    
    describe('sequence', () => {
        it('should parse sequences successfully', () => {
            const parser = sequence(
                matchString('hello'),
                matchString(' '),
                matchString('world')
            );
            const result = parser('hello world', 0);
            
            expect(result.success).toBe(true);
            expect(result.value).toEqual(['hello', ' ', 'world']);
            expect(result.position).toBe(11);
        });
        
        it('should fail if any part fails', () => {
            const parser = sequence(
                matchString('hello'),
                matchString(' '),
                matchString('universe')
            );
            const result = parser('hello world', 0);
            
            expect(result.success).toBe(false);
        });
    });
    
    describe('choice', () => {
        it('should try alternatives', () => {
            const parser = choice(
                matchString('hello'),
                matchString('hi'),
                matchString('hey')
            );
            
            expect(parser('hello', 0).success).toBe(true);
            expect(parser('hi', 0).success).toBe(true);
            expect(parser('hey', 0).success).toBe(true);
            expect(parser('goodbye', 0).success).toBe(false);
        });
    });
    
    describe('optional', () => {
        it('should succeed even if inner parser fails', () => {
            const parser = optional(matchString('hello'));
            
            const result1 = parser('hello world', 0);
            expect(result1.success).toBe(true);
            expect(result1.value).toBe('hello');
            
            const result2 = parser('world', 0);
            expect(result2.success).toBe(true);
            expect(result2.value).toBeUndefined();
        });
    });
    
    describe('many', () => {
        it('should parse zero or more occurrences', () => {
            const parser = repeats(matchString('a'));
            
            const result1 = parser('aaab', 0);
            expect(result1.success).toBe(true);
            expect(result1.value).toEqual(['a', 'a', 'a']);
            
            const result2 = parser('b', 0);
            expect(result2.success).toBe(true);
            expect(result2.value).toEqual([]);
        });
    });
    
    describe('many1', () => {
        it('should parse one or more occurrences', () => {
            const parser = many1(matchString('a'));
            
            const result1 = parser('aaab', 0);
            expect(result1.success).toBe(true);
            expect(result1.value).toEqual(['a', 'a', 'a']);
            
            const result2 = parser('b', 0);
            expect(result2.success).toBe(false);
        });
    });
    
    describe('map', () => {
        it('should transform parser results', () => {
            const parser = map(
                matchRegex(/^\d+/, 'number'),
                str => parseInt(str, 10)
            );
            
            const result = parser('123', 0);
            expect(result.success).toBe(true);
            expect(result.value).toBe(123);
        });
    });
    
    describe('sepBy', () => {
        it('should parse separated lists', () => {
            const parser = sepBy(
                matchRegex(/^\d+/, 'number'),
                matchString(',')
            );
            
            const result1 = parser('1,2,3', 0);
            expect(result1.success).toBe(true);
            expect(result1.value).toEqual(['1', '2', '3']);
            
            const result2 = parser('', 0);
            expect(result2.success).toBe(true);
            expect(result2.value).toEqual([]);
        });
    });
    
    describe('sepBy1', () => {
        it('should parse non-empty separated lists', () => {
            const parser = sepBy1(
                matchRegex(/^\d+/, 'number'),
                matchString(',')
            );
            
            const result1 = parser('1,2,3', 0);
            expect(result1.success).toBe(true);
            expect(result1.value).toEqual(['1', '2', '3']);
            
            const result2 = parser('', 0);
            expect(result2.success).toBe(false);
        });
    });
});

describe('Token Parsers', () => {
    describe('keyword', () => {
        it('should parse keywords', () => {
            const parser = keyword('let');
            
            expect(parser('let x = 1', 0).success).toBe(true);
            expect(parser('letter', 0).success).toBe(false); // 不是完整关键字
            expect(parser('let_var', 0).success).toBe(false); // 后面有标识符字符
        });
    });
    
    describe('identifier', () => {
        it('should parse valid identifiers', () => {
            const parser = identifier();
            
            expect(parser('variable', 0).value).toBe('variable');
            expect(parser('_private', 0).value).toBe('_private');
            expect(parser('var123', 0).value).toBe('var123');
            expect(parser('123var', 0).success).toBe(false);
        });
    });
    
    describe('number', () => {
        it('should parse various number formats', () => {
            const parser = number();
            
            expect(parser('123', 0).value).toBe(123);
            expect(parser('123.45', 0).value).toBe(123.45);
            expect(parser('-123', 0).value).toBe(-123);
            expect(parser('0x1A', 0).value).toBe(26);
            expect(parser('0b1010', 0).value).toBe(10);
            expect(parser('0o17', 0).value).toBe(15);
        });
    });
    
    describe('stringLiteral', () => {
        it('should parse string literals', () => {
            const parser = stringLiteral();
            
            expect(parser('"hello"', 0).value).toBe('hello');
            expect(parser("'world'", 0).value).toBe('world');
            expect(parser('"escaped\\nstring"', 0).value).toBe('escaped\nstring');
        });
    });
    
    describe('boolean', () => {
        it('should parse boolean literals', () => {
            const parser = boolean();
            
            expect(parser('true', 0).value).toBe(true);
            expect(parser('false', 0).value).toBe(false);
        });
    });
});

describe('Whitespace and Comments', () => {
    describe('skipWhitespace', () => {
        it('should skip whitespace characters', () => {
            expect(skipWhitespace('   hello', 0)).toBe(3);
            expect(skipWhitespace('\t\n  hello', 0)).toBe(4);
            expect(skipWhitespace('hello', 0)).toBe(0);
        });
    });
    
    describe('skipComments', () => {
        it('should skip single-line comments', () => {
            expect(skipComments('# comment\nhello', 0)).toBe(10);
            expect(skipComments('hello # comment', 0)).toBe(0);
        });
        
        it('should skip multi-line comments', () => {
            expect(skipComments('<# comment #>hello', 0)).toBe(13);
            expect(skipComments('<# nested <# comment #> #>hello', 0)).toBe(23);
        });
    });
    
    describe('token', () => {
        it('should automatically skip whitespace and comments', () => {
            const parser = withIgnore(matchString('hello'));
            
            expect(parser('   hello', 0).success).toBe(true);
            expect(parser('# comment\nhello', 0).success).toBe(true);
            expect(parser('<# comment #>hello', 0).success).toBe(true);
        });
    });
});