import {
    parseProgram,
    parseIncremental,
    parseExpressionOnly,
    parseWithErrorRecovery,
    validateParseResult,
    formatError,
    formatErrors,
    getParseStats
} from '../src/index';

describe('Main Parser', () => {
    describe('parseProgram', () => {
        it('should parse empty programs', () => {
            const result = parseProgram('', { line: 1, column: 1 });
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('Program');
            expect(result.value?.statements).toHaveLength(0);
        });
        
        it('should parse simple programs', () => {
            const input = `
                let x = 1;
                let y = 2;
                print(x + y);
            `;
            
            const result = parseProgram(input, { line: 1, column: 1 });
            
            expect(result.success).toBe(true);
            expect(result.value?.statements).toHaveLength(3);
            expect(result.value?.statements[0].kind).toBe('VariableDeclaration');
            expect(result.value?.statements[2].kind).toBe('ExpressionStatement');
        });
        
        it('should parse function declarations', () => {
            const input = `
                function add(a: number, b: number) -> number {
                    return a + b;
                }
                
                let result = add(1, 2);
            `;
            
            const result = parseProgram(input, { line: 1, column: 1 });
            
            expect(result.success).toBe(true);
            expect(result.value?.statements).toHaveLength(2);
            expect(result.value?.statements[0].kind).toBe('FunctionDeclaration');
        });
        
        it('should parse class declarations', () => {
            const input = `
                class Person {
                    name: string = "";
                    age: number = 0;
                    
                    constructor(name: string, age: number) {
                        self.name = name;
                        self.age = age;
                    }
                    
                    greet() {
                        print("Hello, I'm " + self.name);
                    }
                }
            `;
            
            const result = parseProgram(input, { line: 1, column: 1 });
            
            expect(result.success).toBe(true);
            expect(result.value?.statements).toHaveLength(1);
            expect(result.value?.statements[0].kind).toBe('ClassDeclaration');
        });
        
        it('should parse union declarations', () => {
            const input = `
                union Person {
                    Student {
                        name: string;
                        grade: number;
                    }
                    Teacher {
                        name: string;
                        department: string;
                    }
                }
            `;
            
            const result = parseProgram(input, { line: 1, column: 1 });
            
            expect(result.success).toBe(true);
            expect(result.value?.statements[0].kind).toBe('UnionDeclaration');
        });
        
        it('should parse trait and impl declarations', () => {
            const input = `
                trait Display {
                    display() -> string;
                }
                
                impl Display for Person {
                    display() -> string {
                        return "Person: " + self.name;
                    }
                }
            `;
            
            const result = parseProgram(input, { line: 1, column: 1 });
            
            expect(result.success).toBe(true);
            expect(result.value?.statements).toHaveLength(2);
            expect(result.value?.statements[0].kind).toBe('TraitDeclaration');
            expect(result.value?.statements[1].kind).toBe('ImplDeclaration');
        });
        
        it('should parse control flow statements', () => {
            const input = `
                if x > 0 {
                    print("positive");
                } else if x < 0 {
                    print("negative");
                } else {
                    print("zero");
                }
                
                match x {
                    case n if n > 0:
                        print("positive");
                        fallthrough!
                    case n if n < 0:
                        print("negative");
                    case _:
                        print("zero");
                }
                
                loop label outer {
                    if condition {
                        break outer;
                    }
                    continue;
                }
            `;
            
            const result = parseProgram(input, { line: 1, column: 1 });
            
            expect(result.success).toBe(true);
            expect(result.value?.statements).toHaveLength(3);
            expect(result.value?.statements[0].kind).toBe('IfStatement');
            expect(result.value?.statements[1].kind).toBe('MatchStatement');
            expect(result.value?.statements[2].kind).toBe('LoopStatement');
        });
        
        it('should parse async and generator functions', () => {
            const input = `
                async function fetchData() {
                    let data = await api.get("/data");
                    return data;
                }
                
                yield function fibonacci() {
                    let a = 0;
                    let b = 1;
                    yield a;
                    yield b;
                    loop {
                        let c = a + b;
                        a = b;
                        b = c;
                        yield c;
                    }
                }
            `;
            
            const result = parseProgram(input, { line: 1, column: 1 });
            
            expect(result.success).toBe(true);
            expect(result.value?.statements).toHaveLength(2);
            expect(result.value?.statements[0].isAsync).toBe(true);
            expect(result.value?.statements[1].isGenerator).toBe(true);
        });
        
        it('should parse error handling', () => {
            const input = `
                try {
                    risky_operation();
                } handler {
                    case Error(msg):
                        print("Error: " + msg);
                    case DivideByZeroError:
                        resume 0;
                    else:
                        print("Unknown error");
                }
                
                function div_fix(default: number) {
                    handler label var {
                        case DivideByZeroError:
                            resume default;
                    }
                }
            `;
            
            const result = parseProgram(input, { line: 1, column: 1 });
            
            expect(result.success).toBe(true);
            expect(result.value?.statements).toHaveLength(2);
            expect(result.value?.statements[0].kind).toBe('Try');
        });
        
        it('should parse macros and type programming', () => {
            const input = `
                type make_optional(ty: Type): Type {
                    if ty.head == "Option" {
                        return ty;
                    } else {
                        Option::<ty>
                    }
                }
                
                macro @repeat(a: AST, b: AST) -> AST {
                    if eval(b) is Number {
                        <% for i in 0..b %>
                            <% print(i, a) %>
                        <% for end %>
                    } else {
                        raise NotImplemented;
                    }
                }
            `;
            
            const result = parseProgram(input, { line: 1, column: 1 });
            
            expect(result.success).toBe(true);
            expect(result.value?.statements).toHaveLength(2);
            expect(result.value?.statements[0].kind).toBe('TypeDeclaration');
            expect(result.value?.statements[1].kind).toBe('MacroDeclaration');
        });
        
        it('should parse import and export statements', () => {
            const input = `
                import { Person, Student } from "./types";
                import * as utils from "./utils";
                import defaultExport from "./default";
                
                export function createPerson(name: string) {
                    return new Person(name);
                }
                
                export { Student };
                export * from "./internal";
            `;
            
            const result = parseProgram(input, { line: 1, column: 1 });
            
            expect(result.success).toBe(true);
            expect(result.value?.statements).toHaveLength(6);
            expect(result.value?.statements[0].kind).toBe('ImportDeclaration');
            expect(result.value?.statements[3].kind).toBe('ExportDeclaration');
        });
    });
    
    describe('parseIncremental', () => {
        it('should handle simple incremental changes', () => {
            const originalText = `
                let x = 1;
                let y = 2;
                print(x + y);
            `;
            
            const originalResult = parseProgram(originalText, { line: 1, column: 1 });
            expect(originalResult.success).toBe(true);
            
            const newText = `
                let x = 1;
                let y = 3; # changed from 2 to 3
                print(x + y);
            `;
            
            const changedPosition = { line: 3, column: 23 };
            const result = parseIncremental(newText, changedPosition, originalResult.value!);
            
            expect(result.success).toBe(true);
            expect(result.value?.statements).toHaveLength(3);
        });
        
        it('should handle insertions', () => {
            const originalText = `
                let x = 1;
                print(x);
            `;
            
            const originalResult = parseProgram(originalText, { line: 1, column: 1 });
            expect(originalResult.success).toBe(true);
            
            const newText = `
                let x = 1;
                let y = 2; # new line
                print(x + y);
            `;
            
            const changedPosition = { line: 3, column: 1 };
            const result = parseIncremental(newText, changedPosition, originalResult.value!);
            
            expect(result.success).toBe(true);
            expect(result.value?.statements).toHaveLength(3);
        });
        
        it('should handle deletions', () => {
            const originalText = `
                let x = 1;
                let y = 2;
                let z = 3;
                print(x + y + z);
            `;
            
            const originalResult = parseProgram(originalText, { line: 1, column: 1 });
            expect(originalResult.success).toBe(true);
            
            const newText = `
                let x = 1;
                let z = 3;
                print(x + z);
            `;
            
            const changedPosition = { line: 3, column: 1 };
            const result = parseIncremental(newText, changedPosition, originalResult.value!);
            
            expect(result.success).toBe(true);
            expect(result.value?.statements).toHaveLength(3);
        });
        
        it('should handle complex structural changes', () => {
            const originalText = `
                function test() {
                    let x = 1;
                    return x;
                }
            `;
            
            const originalResult = parseProgram(originalText, { line: 1, column: 1 });
            expect(originalResult.success).toBe(true);
            
            const newText = `
                function test() {
                    let x = 1;
                    if x > 0 {
                        return x;
                    }
                    return 0;
                }
            `;
            
            const changedPosition = { line: 4, column: 1 };
            const result = parseIncremental(newText, changedPosition, originalResult.value!);
            
            expect(result.success).toBe(true);
            expect(result.value?.statements[0].body.statements).toHaveLength(3);
        });
    });
    
    describe('parseExpressionOnly', () => {
        it('should parse simple expressions', () => {
            const testCases = [
                '1 + 2',
                'x.property',
                'func(a, b)',
                '[1, 2, 3]',
                '{ name: "test", value: 42 }',
                'x > 0 ? "positive" : "not positive"',
                'await promise',
                'yield value'
            ];
            
            testCases.forEach(input => {
                const result = parseExpressionOnly(input, { line: 1, column: 1 });
                expect(result.success).toBe(true);
                expect(result.value?.kind).not.toBe('Program');
            });
        });
        
        it('should reject statements', () => {
            const testCases = [
                'let x = 1;',
                'function test() {}',
                'if (true) {}',
                'class Test {}'
            ];
            
            testCases.forEach(input => {
                const result = parseExpressionOnly(input, { line: 1, column: 1 });
                expect(result.success).toBe(false);
            });
        });
    });
    
    describe('Error recovery', () => {
        it('should recover from syntax errors', () => {
            const input = `
                let x = 1;
                let y =; # syntax error
                let z = 3;
                print(x + z);
            `;
            
            const result = parseWithErrorRecovery(input, { line: 1, column: 1 });
            
            expect(result.success).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.value?.statements).toHaveLength(3); // Should recover and parse remaining statements
        });
        
        it('should recover from missing semicolons', () => {
            const input = `
                let x = 1
                let y = 2;
                print(x + y);
            `;
            
            const result = parseWithErrorRecovery(input, { line: 1, column: 1 });
            
            expect(result.success).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].message).toContain(';');
        });
        
        it('should recover from mismatched braces', () => {
            const input = `
                function test() {
                    let x = 1;
                    if (true) {
                        print(x);
                    # missing closing brace
                
                function another() {
                    return 42;
                }
            `;
            
            const result = parseWithErrorRecovery(input, { line: 1, column: 1 });
            
            expect(result.success).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.value?.statements).toHaveLength(2); // Should parse both functions
        });
        
        it('should handle multiple errors', () => {
            const input = `
                let x =; # error 1
                function test( { # error 2
                    return 1;
                }
                let y = 2;
                print(y);
            `;
            
            const result = parseWithErrorRecovery(input, { line: 1, column: 1 });
            
            expect(result.success).toBe(false);
            expect(result.errors.length).toBeGreaterThan(1);
        });
    });
    
    describe('Validation', () => {
        it('should validate successful parse results', () => {
            const input = 'let x = 1;';
            const result = parseProgram(input, { line: 1, column: 1 });
            
            expect(result.success).toBe(true);
            expect(validateParseResult(result)).toBe(true);
        });
        
        it('should validate failed parse results', () => {
            const input = 'let x =;';
            const result = parseProgram(input, { line: 1, column: 1 });
            
            expect(result.success).toBe(false);
            expect(validateParseResult(result)).toBe(false);
        });
        
        it('should validate partial results with errors', () => {
            const input = `
                let x = 1;
                let y =; # error
                let z = 3;
            `;
            
            const result = parseWithErrorRecovery(input, { line: 1, column: 1 });
            
            expect(result.success).toBe(false);
            expect(validateParseResult(result)).toBe(false);
            expect(result.value).toBeDefined(); // Should have partial result
        });
    });
    
    describe('Error formatting', () => {
        it('should format single errors', () => {
            const input = 'let x =;';
            const result = parseProgram(input, { line: 1, column: 1 });
            
            expect(result.success).toBe(false);
            expect(result.errors).toHaveLength(1);
            
            const formatted = formatError(result.errors[0]);
            expect(formatted).toContain('line');
            expect(formatted).toContain('column');
            expect(formatted).toContain('Expected');
        });
        
        it('should format multiple errors', () => {
            const input = `
                let x =;
                function test( {
                    return 1;
                }
            `;
            
            const result = parseWithErrorRecovery(input, { line: 1, column: 1 });
            
            expect(result.success).toBe(false);
            expect(result.errors.length).toBeGreaterThan(1);
            
            const formatted = formatErrors(result.errors);
            expect(formatted).toContain('Error 1:');
            expect(formatted).toContain('Error 2:');
        });
        
        it('should include context in error messages', () => {
            const input = `
                let x = 1;
                let y =; # error here
                let z = 3;
            `;
            
            const result = parseProgram(input, { line: 1, column: 1 });
            
            expect(result.success).toBe(false);
            const formatted = formatError(result.errors[0]);
            expect(formatted).toContain('let y =');
        });
    });
    
    describe('Parse statistics', () => {
        it('should provide parse statistics', () => {
            const input = `
                function test() {
                    let x = 1;
                    return x;
                }
                
                let y = test();
                print(y);
            `;
            
            const result = parseProgram(input, { line: 1, column: 1 });
            
            expect(result.success).toBe(true);
            
            const stats = getParseStats(result);
            expect(stats.totalNodes).toBeGreaterThan(0);
            expect(stats.statements).toBe(3);
            expect(stats.expressions).toBeGreaterThan(0);
            expect(stats.functions).toBe(1);
            expect(stats.classes).toBe(0);
        });
        
        it('should count different node types', () => {
            const input = `
                class Person {
                    name: string;
                    constructor(name: string) {
                        self.name = name;
                    }
                }
                
                function createPerson(name: string) {
                    return new Person(name);
                }
                
                let person = createPerson("Alice");
            `;
            
            const result = parseProgram(input, { line: 1, column: 1 });
            
            expect(result.success).toBe(true);
            
            const stats = getParseStats(result);
            expect(stats.classes).toBe(1);
            expect(stats.functions).toBe(2); // constructor + createPerson
            expect(stats.statements).toBe(3);
        });
    });
    
    describe('Comments and whitespace', () => {
        it('should handle single-line comments', () => {
            const input = `
                let x = 1; # this is a comment
                # this is another comment
                let y = 2;
            `;
            
            const result = parseProgram(input, { line: 1, column: 1 });
            
            expect(result.success).toBe(true);
            expect(result.value?.statements).toHaveLength(2);
        });
        
        it('should handle multi-line comments', () => {
            const input = `
                let x = 1;
                <# this is a
                   multi-line comment #>
                let y = 2;
            `;
            
            const result = parseProgram(input, { line: 1, column: 1 });
            
            expect(result.success).toBe(true);
            expect(result.value?.statements).toHaveLength(2);
        });
        
        it('should handle nested multi-line comments', () => {
            const input = `
                let x = 1;
                <# outer comment
                   <# nested comment #>
                   still in outer #>
                let y = 2;
            `;
            
            const result = parseProgram(input, { line: 1, column: 1 });
            
            expect(result.success).toBe(true);
            expect(result.value?.statements).toHaveLength(2);
        });
        
        it('should handle mixed whitespace', () => {
            const input = `\t\n  let x = 1;\r\n\t  let y = 2;  \n`;
            
            const result = parseProgram(input, { line: 1, column: 1 });
            
            expect(result.success).toBe(true);
            expect(result.value?.statements).toHaveLength(2);
        });
    });
    
    describe('Location tracking', () => {
        it('should track locations for all nodes', () => {
            const input = `
                let x = 1;
                function test() {
                    return x;
                }
            `;
            
            const result = parseProgram(input, { line: 1, column: 1 });
            
            expect(result.success).toBe(true);
            expect(result.value?.location).toBeDefined();
            expect(result.value?.statements[0].location).toBeDefined();
            expect(result.value?.statements[1].location).toBeDefined();
        });
        
        it('should track accurate line and column numbers', () => {
            const input = `let x = 1;
let y = 2;`;
            
            const result = parseProgram(input, { line: 1, column: 1 });
            
            expect(result.success).toBe(true);
            expect(result.value?.statements[0].location.start.line).toBe(1);
            expect(result.value?.statements[1].location.start.line).toBe(2);
        });
        
        it('should handle custom start positions', () => {
            const input = 'let x = 1;';
            
            const result = parseProgram(input, { line: 5, column: 10 });
            
            expect(result.success).toBe(true);
            expect(result.value?.location.start.line).toBe(5);
            expect(result.value?.location.start.column).toBe(10);
        });
    });
});