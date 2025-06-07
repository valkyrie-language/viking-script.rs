import {
    parseVariableDeclaration,
    parseAssignment,
    parseIfStatement,
    parseMatchStatement,
    parseLoopStatement,
    parseFunctionDeclaration,
    parseClassDeclaration,
    parseStatement
} from '../src/parser/statement';

describe('Statement Parsers', () => {
    describe('parseVariableDeclaration', () => {
        it('should parse simple variable declarations', () => {
            const result = parseVariableDeclaration()('let x = 1;', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('VariableDeclaration');
            expect(result.value?.mutable).toBe(false);
            expect(result.value?.pattern.name).toBe('x');
        });
        
        it('should parse mutable variable declarations', () => {
            const result = parseVariableDeclaration()('let mut x = 1;', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.mutable).toBe(true);
        });
        
        it('should parse typed variable declarations', () => {
            const result = parseVariableDeclaration()('let x: number = 1;', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.typeAnnotation).toBeDefined();
        });
        
        it('should parse declarations without initializers', () => {
            const result = parseVariableDeclaration()('let x: number;', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.initializer).toBeUndefined();
        });
        
        it('should parse destructuring declarations', () => {
            const result = parseVariableDeclaration()('let {a, b} = obj;', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.pattern.kind).toBe('ObjectPattern');
        });
        
        it('should parse array destructuring', () => {
            const result = parseVariableDeclaration()('let [a, b] = arr;', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.pattern.kind).toBe('ArrayPattern');
        });
    });
    
    describe('parseAssignment', () => {
        it('should parse simple assignments', () => {
            const result = parseAssignment()('x = 1;', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('Assignment');
            expect(result.value?.operator).toBe('=');
        });
        
        it('should parse compound assignments', () => {
            const testCases = [
                ['x += 1;', '+='],
                ['x -= 1;', '-='],
                ['x *= 1;', '*='],
                ['x /= 1;', '/='],
                ['x %= 1;', '%='],
                ['x &= 1;', '&='],
                ['x |= 1;', '|='],
                ['x ^= 1;', '^='],
                ['x <<= 1;', '<<='],
                ['x >>= 1;', '>>='],
                ['x ??= 1;', '??=']
            ];
            
            testCases.forEach(([input, expectedOp]) => {
                const result = parseAssignment()(input, 0);
                expect(result.success).toBe(true);
                expect(result.value?.operator).toBe(expectedOp);
            });
        });
        
        it('should parse member expression assignments', () => {
            const result = parseAssignment()('obj.prop = value;', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.left.kind).toBe('MemberExpression');
        });
        
        it('should parse computed member assignments', () => {
            const result = parseAssignment()('obj[key] = value;', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.left.kind).toBe('MemberExpression');
            expect(result.value?.left.computed).toBe(true);
        });
    });
    
    describe('parseIfStatement', () => {
        it('should parse simple if statements', () => {
            const result = parseIfStatement()('if (x > 0) { print("positive"); }', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('IfStatement');
            expect(result.value?.condition).toBeDefined();
            expect(result.value?.thenBranch).toBeDefined();
        });
        
        it('should parse if-else statements', () => {
            const result = parseIfStatement()('if (x > 0) { print("positive"); } else { print("not positive"); }', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.elseBranch).toBeDefined();
        });
        
        it('should parse if-else-if chains', () => {
            const input = `if (x > 0) {
                print("positive");
            } else if (x < 0) {
                print("negative");
            } else {
                print("zero");
            }`;
            
            const result = parseIfStatement()(input, 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.elseIfs).toHaveLength(1);
            expect(result.value?.elseBranch).toBeDefined();
        });
        
        it('should handle fallthrough', () => {
            const input = `if (x > 0) {
                print("positive");
                fallthrough;
            } else {
                print("done");
            }`;
            
            const result = parseIfStatement()(input, 0);
            
            expect(result.success).toBe(true);
        });
    });
    
    describe('parseMatchStatement', () => {
        it('should parse simple match statements', () => {
            const input = `match x {
                case 1: print("one");
                case 2: print("two");
                case _: print("other");
            }`;
            
            const result = parseMatchStatement()(input, 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('MatchStatement');
            expect(result.value?.cases).toHaveLength(3);
        });
        
        it('should parse match with guards', () => {
            const input = `match x {
                case n if n > 0: print("positive");
                case _: print("not positive");
            }`;
            
            const result = parseMatchStatement()(input, 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.cases[0].guard).toBeDefined();
        });
        
        it('should parse match with fallthrough', () => {
            const input = `match x {
                case 1:
                    print("one");
                    fallthrough!
                case 2:
                    print("one or two");
                    fallthrough
                case _:
                    print("done");
            }`;
            
            const result = parseMatchStatement()(input, 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.cases[0].fallthrough).toBe('unchecked');
            expect(result.value?.cases[1].fallthrough).toBe('checked');
            expect(result.value?.cases[2].fallthrough).toBe('none');
        });
        
        it('should parse destructuring patterns', () => {
            const input = `match person {
                case Student { name, age, grade }: print(name);
                case Teacher { name, department }: print(department);
            }`;
            
            const result = parseMatchStatement()(input, 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.cases[0].pattern.kind).toBe('ObjectPattern');
        });
    });
    
    describe('parseLoopStatement', () => {
        it('should parse simple loops', () => {
            const result = parseLoopStatement()('loop { break; }', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('LoopStatement');
            expect(result.value?.label).toBeUndefined();
        });
        
        it('should parse labeled loops', () => {
            const result = parseLoopStatement()('loop label outer { break outer; }', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.label).toBe('outer');
        });
    });
    
    describe('parseFunctionDeclaration', () => {
        it('should parse simple functions', () => {
            const result = parseFunctionDeclaration()('function add(a, b) { return a + b; }', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('FunctionDeclaration');
            expect(result.value?.name).toBe('add');
            expect(result.value?.parameters).toHaveLength(2);
        });
        
        it('should parse typed functions', () => {
            const result = parseFunctionDeclaration()('function add(a: number, b: number) -> number { return a + b; }', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.returnType).toBeDefined();
            expect(result.value?.parameters[0].type).toBeDefined();
        });
        
        it('should parse async functions', () => {
            const result = parseFunctionDeclaration()('async function fetchData() { return await api.get(); }', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.isAsync).toBe(true);
        });
        
        it('should parse generator functions', () => {
            const result = parseFunctionDeclaration()('yield function fibonacci() { yield 1; yield 1; }', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.isGenerator).toBe(true);
        });
        
        it('should parse generic functions', () => {
            const result = parseFunctionDeclaration()('function identity<T>(x: T) -> T { return x; }', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.typeParameters).toHaveLength(1);
        });
        
        it('should parse functions with default parameters', () => {
            const result = parseFunctionDeclaration()('function greet(name: string = "World") { print("Hello, " + name); }', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.parameters[0].defaultValue).toBeDefined();
        });
    });
    
    describe('parseClassDeclaration', () => {
        it('should parse simple classes', () => {
            const input = `class Person {
                name: string = "";
                age: number = 0;
                constructor(name: string, age: number) {
                    self.name = name;
                    self.age = age;
                }
                greet() {
                    print("Hello, I'm " + self.name);
                }
            }`;
            
            const result = parseClassDeclaration()(input, 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('ClassDeclaration');
            expect(result.value?.name).toBe('Person');
            expect(result.value?.members).toHaveLength(4); // 2 fields + 1 constructor + 1 method
        });
        
        it('should parse class inheritance', () => {
            const input = `class Student extends Person {
                grade: number = 0;
            }`;
            
            const result = parseClassDeclaration()(input, 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.superClass).toBeDefined();
        });
        
        it('should parse interface implementation', () => {
            const input = `class Person implements Display, Comparable {
                name: string = "";
            }`;
            
            const result = parseClassDeclaration()(input, 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.interfaces).toHaveLength(2);
        });
        
        it('should parse generic classes', () => {
            const input = `class Container<T> {
                value: T;
                constructor(value: T) {
                    self.value = value;
                }
            }`;
            
            const result = parseClassDeclaration()(input, 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.typeParameters).toHaveLength(1);
        });
        
        it('should parse static methods', () => {
            const input = `class Math {
                static add(a: number, b: number) -> number {
                    return a + b;
                }
            }`;
            
            const result = parseClassDeclaration()(input, 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.members[0].isStatic).toBe(true);
        });
    });
    
    describe('Control flow statements', () => {
        it('should parse break statements', () => {
            const result = parseStatement()('break;', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('BreakStatement');
        });
        
        it('should parse labeled break statements', () => {
            const result = parseStatement()('break outer;', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.label).toBe('outer');
        });
        
        it('should parse continue statements', () => {
            const result = parseStatement()('continue;', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('ContinueStatement');
        });
        
        it('should parse return statements', () => {
            const result = parseStatement()('return 42;', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('ReturnStatement');
            expect(result.value?.value).toBeDefined();
        });
        
        it('should parse empty return statements', () => {
            const result = parseStatement()('return;', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.value).toBeUndefined();
        });
        
        it('should parse yield statements', () => {
            const result = parseStatement()('yield 42;', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('Yield');
            expect(result.value?.isYieldFrom).toBe(false);
        });
        
        it('should parse yield from statements', () => {
            const result = parseStatement()('yield from generator;', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.isYieldFrom).toBe(true);
        });
        
        it('should parse throw statements', () => {
            const result = parseStatement()('raise Error("message");', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('Throw');
        });
    });
    
    describe('Error handling', () => {
        it('should parse try-handler blocks', () => {
            const input = `try {
                risky_operation();
            } handler {
                case Error(msg): print("Error: " + msg);
                else: print("Unknown error");
            }`;
            
            const result = parseStatement()(input, 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('Try');
            expect(result.value?.handlers).toHaveLength(2);
        });
        
        it('should parse labeled handlers', () => {
            const input = `try {
                operation();
            } handler label h {
                case Error: resume default_value;
            }`;
            
            const result = parseStatement()(input, 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.label).toBe('h');
        });
        
        it('should parse with handlers', () => {
            const input = `try {
                operation();
            } handler {
                with debug_handler;
                case SpecificError: handle_specific();
            }`;
            
            const result = parseStatement()(input, 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.handlers[0].type).toBe('with');
        });
    });
    
    describe('Import/Export statements', () => {
        it('should parse import statements', () => {
            const testCases = [
                ['import { a, b } from "module";', 'named'],
                ['import * as mod from "module";', 'namespace'],
                ['import defaultExport from "module";', 'default']
            ];
            
            testCases.forEach(([input, expectedType]) => {
                const result = parseStatement()(input, 0);
                expect(result.success).toBe(true);
                expect(result.value?.kind).toBe('ImportDeclaration');
                expect(result.value?.specifier.type).toBe(expectedType);
            });
        });
        
        it('should parse export statements', () => {
            const testCases = [
                'export function test() {}',
                'export class Test {}',
                'export let x = 1;',
                'export { a, b };',
                'export * from "module";'
            ];
            
            testCases.forEach(input => {
                const result = parseStatement()(input, 0);
                expect(result.success).toBe(true);
                expect(result.value?.kind).toBe('ExportDeclaration');
            });
        });
    });
    
    describe('Error recovery', () => {
        it('should handle syntax errors gracefully', () => {
            const result = parseStatement()('let x =;', 0);
            
            expect(result.success).toBe(false);
            expect(result.errors).toHaveLength(1);
        });
        
        it('should handle missing semicolons', () => {
            const result = parseStatement()('let x = 1', 0);
            
            expect(result.success).toBe(false);
            expect(result.errors[0].message).toContain(';');
        });
        
        it('should handle mismatched braces', () => {
            const result = parseStatement()('if (true) { print("test");', 0);
            
            expect(result.success).toBe(false);
            expect(result.errors[0].message).toContain('}');
        });
    });
});