import {
    parsePrimitiveType,
    parseIdentifierType,
    parseArrayType,
    parseTupleType,
    parseObjectType,
    parseFunctionType,
    parseGenericType,
    parseUnionType,
    parseIntersectionType,
    parseTypeAnnotation
} from '../src/parser/type';

describe('Type Parsers', () => {
    describe('parsePrimitiveType', () => {
        it('should parse basic primitive types', () => {
            const primitives = [
                'number', 'string', 'boolean', 'null', 'undefined',
                'void', 'any', 'unknown', 'never'
            ];
            
            primitives.forEach(type => {
                const result = parsePrimitiveType()(type, 0);
                expect(result.success).toBe(true);
                expect(result.value?.kind).toBe('PrimitiveType');
                expect(result.value?.name).toBe(type);
            });
        });
        
        it('should not parse non-primitive types', () => {
            const result = parsePrimitiveType()('CustomType', 0);
            expect(result.success).toBe(false);
        });
    });
    
    describe('parseIdentifierType', () => {
        it('should parse simple identifier types', () => {
            const result = parseIdentifierType()('Person', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('IdentifierType');
            expect(result.value?.name).toBe('Person');
        });
        
        it('should parse qualified identifier types', () => {
            const result = parseIdentifierType()('Module.Person', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.name).toBe('Module.Person');
        });
        
        it('should parse deeply qualified types', () => {
            const result = parseIdentifierType()('A.B.C.Type', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.name).toBe('A.B.C.Type');
        });
    });
    
    describe('parseArrayType', () => {
        it('should parse simple array types', () => {
            const result = parseArrayType()('number[]', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('ArrayType');
            expect(result.value?.elementType.kind).toBe('PrimitiveType');
        });
        
        it('should parse nested array types', () => {
            const result = parseArrayType()('number[][]', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.elementType.kind).toBe('ArrayType');
        });
        
        it('should parse complex element types', () => {
            const result = parseArrayType()('(string | number)[]', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.elementType.kind).toBe('UnionType');
        });
    });
    
    describe('parseTupleType', () => {
        it('should parse empty tuples', () => {
            const result = parseTupleType()('[]', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('TupleType');
            expect(result.value?.elements).toHaveLength(0);
        });
        
        it('should parse simple tuples', () => {
            const result = parseTupleType()('[string, number]', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.elements).toHaveLength(2);
            expect(result.value?.elements[0].kind).toBe('PrimitiveType');
        });
        
        it('should parse tuples with optional elements', () => {
            const result = parseTupleType()('[string, number?]', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.elements[1].optional).toBe(true);
        });
        
        it('should parse tuples with rest elements', () => {
            const result = parseTupleType()('[string, ...number[]]', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.elements[1].rest).toBe(true);
        });
        
        it('should parse named tuple elements', () => {
            const result = parseTupleType()('[name: string, age: number]', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.elements[0].name).toBe('name');
            expect(result.value?.elements[1].name).toBe('age');
        });
        
        it('should handle trailing commas', () => {
            const result = parseTupleType()('[string, number,]', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.elements).toHaveLength(2);
        });
    });
    
    describe('parseObjectType', () => {
        it('should parse empty object types', () => {
            const result = parseObjectType()('{}', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('ObjectType');
            expect(result.value?.properties).toHaveLength(0);
        });
        
        it('should parse simple object types', () => {
            const result = parseObjectType()('{ name: string; age: number; }', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.properties).toHaveLength(2);
            expect(result.value?.properties[0].key).toBe('name');
            expect(result.value?.properties[0].type.kind).toBe('PrimitiveType');
        });
        
        it('should parse optional properties', () => {
            const result = parseObjectType()('{ name?: string; }', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.properties[0].optional).toBe(true);
        });
        
        it('should parse readonly properties', () => {
            const result = parseObjectType()('{ readonly id: number; }', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.properties[0].readonly).toBe(true);
        });
        
        it('should parse computed properties', () => {
            const result = parseObjectType()('{ [key: string]: any; }', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.properties[0].computed).toBe(true);
            expect(result.value?.properties[0].keyType).toBeDefined();
        });
        
        it('should parse method signatures', () => {
            const result = parseObjectType()('{ getName(): string; }', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.properties[0].type.kind).toBe('FunctionType');
        });
        
        it('should handle trailing commas and semicolons', () => {
            const testCases = [
                '{ a: string, b: number, }',
                '{ a: string; b: number; }',
                '{ a: string, b: number; }'
            ];
            
            testCases.forEach(input => {
                const result = parseObjectType()(input, 0);
                expect(result.success).toBe(true);
                expect(result.value?.properties).toHaveLength(2);
            });
        });
    });
    
    describe('parseFunctionType', () => {
        it('should parse simple function types', () => {
            const result = parseFunctionType()('() -> void', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('FunctionType');
            expect(result.value?.parameters).toHaveLength(0);
            expect(result.value?.returnType.kind).toBe('PrimitiveType');
        });
        
        it('should parse function types with parameters', () => {
            const result = parseFunctionType()('(x: number, y: string) -> boolean', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.parameters).toHaveLength(2);
            expect(result.value?.parameters[0].name).toBe('x');
            expect(result.value?.parameters[0].type.kind).toBe('PrimitiveType');
        });
        
        it('should parse function types with optional parameters', () => {
            const result = parseFunctionType()('(x: number, y?: string) -> void', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.parameters[1].optional).toBe(true);
        });
        
        it('should parse function types with rest parameters', () => {
            const result = parseFunctionType()('(x: number, ...args: string[]) -> void', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.parameters[1].rest).toBe(true);
        });
        
        it('should parse generic function types', () => {
            const result = parseFunctionType()('<T>(x: T) -> T', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.typeParameters).toHaveLength(1);
            expect(result.value?.typeParameters[0].name).toBe('T');
        });
        
        it('should parse async function types', () => {
            const result = parseFunctionType()('async () -> Promise<void>', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.isAsync).toBe(true);
        });
    });
    
    describe('parseGenericType', () => {
        it('should parse simple generic types', () => {
            const result = parseGenericType()('Array<string>', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('GenericType');
            expect(result.value?.base.name).toBe('Array');
            expect(result.value?.typeArguments).toHaveLength(1);
        });
        
        it('should parse multiple type arguments', () => {
            const result = parseGenericType()('Map<string, number>', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.typeArguments).toHaveLength(2);
        });
        
        it('should parse nested generic types', () => {
            const result = parseGenericType()('Promise<Array<string>>', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.typeArguments[0].kind).toBe('GenericType');
        });
        
        it('should parse complex type arguments', () => {
            const result = parseGenericType()('Result<string | number, Error>', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.typeArguments[0].kind).toBe('UnionType');
        });
        
        it('should handle trailing commas', () => {
            const result = parseGenericType()('Map<string, number,>', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.typeArguments).toHaveLength(2);
        });
    });
    
    describe('parseUnionType', () => {
        it('should parse simple union types', () => {
            const result = parseUnionType()('string | number', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('UnionType');
            expect(result.value?.types).toHaveLength(2);
        });
        
        it('should parse multiple union types', () => {
            const result = parseUnionType()('string | number | boolean | null', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.types).toHaveLength(4);
        });
        
        it('should parse nested union types', () => {
            const result = parseUnionType()('(string | number) | boolean', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.types[0].kind).toBe('UnionType');
        });
        
        it('should handle complex union members', () => {
            const result = parseUnionType()('Array<string> | Map<string, number>', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.types[0].kind).toBe('GenericType');
            expect(result.value?.types[1].kind).toBe('GenericType');
        });
    });
    
    describe('parseIntersectionType', () => {
        it('should parse simple intersection types', () => {
            const result = parseIntersectionType()('A & B', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('IntersectionType');
            expect(result.value?.types).toHaveLength(2);
        });
        
        it('should parse multiple intersection types', () => {
            const result = parseIntersectionType()('A & B & C & D', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.types).toHaveLength(4);
        });
        
        it('should parse object intersection types', () => {
            const result = parseIntersectionType()('{ a: string } & { b: number }', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.types[0].kind).toBe('ObjectType');
            expect(result.value?.types[1].kind).toBe('ObjectType');
        });
    });
    
    describe('Complex type combinations', () => {
        it('should parse union of intersections', () => {
            const result = parseTypeAnnotation()('(A & B) | (C & D)', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('UnionType');
            expect(result.value?.types[0].kind).toBe('IntersectionType');
        });
        
        it('should parse intersection of unions', () => {
            const result = parseTypeAnnotation()('(A | B) & (C | D)', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('IntersectionType');
            expect(result.value?.types[0].kind).toBe('UnionType');
        });
        
        it('should parse function types in unions', () => {
            const result = parseTypeAnnotation()('(() -> void) | string', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.types[0].kind).toBe('FunctionType');
        });
        
        it('should parse generic function types', () => {
            const result = parseTypeAnnotation()('<T>(x: T) -> Promise<T>', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('FunctionType');
            expect(result.value?.typeParameters).toHaveLength(1);
            expect(result.value?.returnType.kind).toBe('GenericType');
        });
    });
    
    describe('Conditional and mapped types', () => {
        it('should parse conditional types', () => {
            const result = parseTypeAnnotation()('T extends string ? string : number', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('ConditionalType');
            expect(result.value?.checkType.name).toBe('T');
            expect(result.value?.extendsType.kind).toBe('PrimitiveType');
        });
        
        it('should parse mapped types', () => {
            const result = parseTypeAnnotation()('{ [K in keyof T]: T[K] }', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('MappedType');
            expect(result.value?.typeParameter).toBe('K');
        });
        
        it('should parse keyof types', () => {
            const result = parseTypeAnnotation()('keyof Person', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('KeyofType');
            expect(result.value?.type.name).toBe('Person');
        });
        
        it('should parse typeof types', () => {
            const result = parseTypeAnnotation()('typeof someVariable', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('TypeofType');
        });
    });
    
    describe('Literal types', () => {
        it('should parse string literal types', () => {
            const result = parseTypeAnnotation()('"hello"', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('LiteralType');
            expect(result.value?.value).toBe('hello');
        });
        
        it('should parse number literal types', () => {
            const result = parseTypeAnnotation()('42', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('LiteralType');
            expect(result.value?.value).toBe(42);
        });
        
        it('should parse boolean literal types', () => {
            const testCases = ['true', 'false'];
            
            testCases.forEach(input => {
                const result = parseTypeAnnotation()(input, 0);
                expect(result.success).toBe(true);
                expect(result.value?.kind).toBe('LiteralType');
            });
        });
        
        it('should parse template literal types', () => {
            const result = parseTypeAnnotation()('`hello ${string}`', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('TemplateLiteralType');
        });
    });
    
    describe('Parenthesized types', () => {
        it('should parse parenthesized types', () => {
            const result = parseTypeAnnotation()('(string | number)', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('UnionType');
        });
        
        it('should handle nested parentheses', () => {
            const result = parseTypeAnnotation()('((string | number) & boolean)', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.kind).toBe('IntersectionType');
        });
    });
    
    describe('Error handling', () => {
        it('should handle syntax errors in types', () => {
            const result = parseTypeAnnotation()('string |', 0);
            
            expect(result.success).toBe(false);
            expect(result.errors).toHaveLength(1);
        });
        
        it('should handle mismatched brackets', () => {
            const result = parseTypeAnnotation()('Array<string', 0);
            
            expect(result.success).toBe(false);
            expect(result.errors[0].message).toContain('>');
        });
        
        it('should handle invalid type syntax', () => {
            const result = parseTypeAnnotation()('123abc', 0);
            
            expect(result.success).toBe(false);
        });
    });
    
    describe('Location tracking', () => {
        it('should track locations for simple types', () => {
            const result = parseTypeAnnotation()('string', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.location).toBeDefined();
            expect(result.value?.location.start.line).toBe(1);
            expect(result.value?.location.start.column).toBe(1);
        });
        
        it('should track locations for complex types', () => {
            const result = parseTypeAnnotation()('Array<string | number>', 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.location).toBeDefined();
            expect(result.value?.typeArguments[0].location).toBeDefined();
        });
        
        it('should track locations across multiple lines', () => {
            const input = `{
  name: string;
  age: number;
}`;
            
            const result = parseTypeAnnotation()(input, 0);
            
            expect(result.success).toBe(true);
            expect(result.value?.location.end.line).toBeGreaterThan(1);
        });
    });
});