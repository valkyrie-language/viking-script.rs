# Viking Language Parser

A parser for the Viking programming language built using parser combinators in TypeScript.

## Features

- **Parser Combinators**: Built from scratch using functional parser combinators
- **Error Recovery**: Robust error handling with recovery mechanisms
- **Incremental Parsing**: Support for incremental parsing for better IDE performance
- **Location Tracking**: Precise source location tracking for all AST nodes
- **Viking Language Support**: Full support for Viking language syntax including:
  - Variables with mutability annotations
  - Pattern matching with guards and fallthrough
  - Classes, unions, traits, and implementations
  - Async/await and generators
  - Algebraic effects for error handling
  - Type programming and macros
  - Comments (single-line `#` and nested multi-line `<# #>`)

## Installation

```bash
npm install vks-parser
```

## Usage

### Basic Parsing

```typescript
import { parseProgram } from 'vks-parser';

const source = `
  let mut x = 1;
  x = x + 1;
  print(x);
`;

const result = parseProgram(source, { line: 1, column: 1 });

if (result.success) {
  console.log('Parsed successfully:', result.value);
} else {
  console.error('Parse errors:', result.errors);
}
```

### Expression-Only Parsing

```typescript
import { parseExpressionOnly } from 'vks-parser';

const expr = 'x + y * 2';
const result = parseExpressionOnly(expr, { line: 1, column: 1 });
```

### Incremental Parsing

```typescript
import { parseProgram, parseIncremental } from 'vks-parser';

// Initial parse
const originalSource = 'let x = 1;\nlet y = 2;';
const originalResult = parseProgram(originalSource, { line: 1, column: 1 });

// After editing
const newSource = 'let x = 1;\nlet y = 3;'; // changed 2 to 3
const changedPosition = { line: 2, column: 9 };
const incrementalResult = parseIncremental(newSource, changedPosition, originalResult.value!);
```

### Error Recovery

```typescript
import { parseWithErrorRecovery } from 'vks-parser';

const sourceWithErrors = `
  let x = 1;
  let y =; // syntax error
  let z = 3;
  print(x + z);
`;

const result = parseWithErrorRecovery(sourceWithErrors, { line: 1, column: 1 });
// Will parse successfully with errors reported, recovering to parse remaining statements
```

## Viking Language Syntax Examples

### Variables and Mutability

```viking
let x = 1;        # immutable
let mut y = 2;    # mutable
y = 3;            # ok
# x = 4;          # compile error
```

### Pattern Matching

```viking
match value {
  case x > 0:
    print("positive");
    fallthrough!  # run next case without check
  case x < 0:
    print("negative");
    fallthrough   # run next case with check
  case _:
    print("zero");
}
```

### Classes and Unions

```viking
class Person {
  name: string = "";
  age: number = 0;
  
  constructor(name: string, age: number) {
    self.name = name;
    self.age = age;
  }
}

union Shape {
  Circle { radius: number }
  Rectangle { width: number; height: number }
}
```

### Traits and Implementations

```viking
trait Display {
  display() -> string;
}

impl Display for Person {
  display() -> string {
    return "Person: " + self.name;
  }
}
```

### Async and Generators

```viking
async function fetchData() {
  let data = await api.get("/data");
  return data;
}

yield function fibonacci() {
  let a = 0, b = 1;
  yield a;
  yield b;
  loop {
    let c = a + b;
    a = b;
    b = c;
    yield c;
  }
}
```

### Algebraic Effects

```viking
try {
  risky_operation();
} handler {
  case DivideByZeroError:
    resume 0;
  case Error(msg):
    print("Error: " + msg);
  else:
    print("Unknown error");
}
```

## API Reference

### Main Functions

- `parseProgram(text: string, startPosition: Position): ParseResult<Program>`
- `parseIncremental(text: string, changedPosition: Position, oldAst: Program): ParseResult<Program>`
- `parseExpressionOnly(text: string, startPosition: Position): ParseResult<Expression>`
- `parseWithErrorRecovery(text: string, startPosition: Position): ParseResult<Program>`

### Utility Functions

- `validateParseResult(result: ParseResult<any>): boolean`
- `formatError(error: ParseError): string`
- `formatErrors(errors: ParseError[]): string`
- `getParseStats(result: ParseResult<Program>): ParseStats`

### Types

```typescript
interface Position {
  line: number;
  column: number;
}

interface ParseResult<T> {
  success: boolean;
  value?: T;
  errors: ParseError[];
  position: number;
}

interface ParseError {
  message: string;
  location: Location;
  expected?: string[];
  actual?: string;
}
```

## Parser Architecture

### Parser Combinators

The parser is built using functional parser combinators located in `src/helper/index.ts`:

- **Basic Combinators**: `matchString`, `matchRegex`, `sequence`, `choice`, `optional`, `many`
- **Token Parsers**: `keyword`, `identifier`, `number`, `string`, `boolean`
- **Utility Combinators**: `sepBy`, `map`, `skipWhitespace`, `skipComments`

### Parser Structure

- `src/helper/index.ts` - Parser combinator definitions
- `src/parser/literal.ts` - Literal value parsers
- `src/parser/expression.ts` - Expression parsers
- `src/parser/pattern.ts` - Pattern matching parsers
- `src/parser/type.ts` - Type annotation parsers
- `src/parser/statement.ts` - Statement parsers
- `src/index.ts` - Main parser entry point

### Error Recovery

The parser implements several error recovery strategies:

1. **Statement-level recovery**: Skips to the next statement boundary on errors
2. **Expression recovery**: Attempts to recover within expressions
3. **Bracket matching**: Handles mismatched brackets and braces
4. **Multiple error reporting**: Collects and reports multiple errors in a single pass

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

Test files are organized by parser component:
- `tests/helper.test.ts` - Parser combinator tests
- `tests/literal.test.ts` - Literal parser tests
- `tests/expression.test.ts` - Expression parser tests
- `tests/pattern.test.ts` - Pattern parser tests
- `tests/type.test.ts` - Type parser tests
- `tests/statement.test.ts` - Statement parser tests
- `tests/index.test.ts` - Integration tests

## Development

```bash
# Build the project
npm run build

# Build in watch mode
npm run dev

# Clean build artifacts
npm run clean
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.