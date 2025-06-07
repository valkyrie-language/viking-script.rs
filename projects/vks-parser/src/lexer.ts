/**
 * Viking Script Lexer
 * 词法分析器，将源代码转换为 token 流
 */

export interface Position {
  line: number;
  column: number;
}

export interface Location {
  start: Position;
  end: Position;
  file: string;
}

export enum TokenType {
  // 字面量
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  BOOLEAN = 'BOOLEAN',
  NULL = 'NULL',
  UNDEFINED = 'UNDEFINED',
  
  // 标识符和关键字
  IDENTIFIER = 'IDENTIFIER',
  
  // 关键字
  LET = 'LET',
  MUT = 'MUT',
  CONST = 'CONST',
  IF = 'IF',
  ELSE = 'ELSE',
  MATCH = 'MATCH',
  CASE = 'CASE',
  FALLTHROUGH = 'FALLTHROUGH',
  LOOP = 'LOOP',
  LABEL = 'LABEL',
  BREAK = 'BREAK',
  CONTINUE = 'CONTINUE',
  FUNCTION = 'FUNCTION',
  RETURN = 'RETURN',
  CLASS = 'CLASS',
  UNION = 'UNION',
  TRAIT = 'TRAIT',
  IMPL = 'IMPL',
  FOR = 'FOR',
  IN = 'IN',
  YIELD = 'YIELD',
  ASYNC = 'ASYNC',
  AWAIT = 'AWAIT',
  TRY = 'TRY',
  HANDLER = 'HANDLER',
  WITH = 'WITH',
  RAISE = 'RAISE',
  RESUME = 'RESUME',
  CALLCC = 'CALLCC',
  TYPE = 'TYPE',
  MACRO = 'MACRO',
  SELF = 'SELF',
  THIS = 'THIS',
  CONSTRUCTOR = 'CONSTRUCTOR',
  IS = 'IS',
  AS = 'AS',
  
  // 操作符
  PLUS = 'PLUS',
  MINUS = 'MINUS',
  MULTIPLY = 'MULTIPLY',
  DIVIDE = 'DIVIDE',
  MODULO = 'MODULO',
  POWER = 'POWER',
  
  ASSIGN = 'ASSIGN',
  PLUS_ASSIGN = 'PLUS_ASSIGN',
  MINUS_ASSIGN = 'MINUS_ASSIGN',
  MULTIPLY_ASSIGN = 'MULTIPLY_ASSIGN',
  DIVIDE_ASSIGN = 'DIVIDE_ASSIGN',
  
  EQUAL = 'EQUAL',
  NOT_EQUAL = 'NOT_EQUAL',
  LESS_THAN = 'LESS_THAN',
  LESS_EQUAL = 'LESS_EQUAL',
  GREATER_THAN = 'GREATER_THAN',
  GREATER_EQUAL = 'GREATER_EQUAL',
  
  LOGICAL_AND = 'LOGICAL_AND',
  LOGICAL_OR = 'LOGICAL_OR',
  LOGICAL_NOT = 'LOGICAL_NOT',
  
  BITWISE_AND = 'BITWISE_AND',
  BITWISE_OR = 'BITWISE_OR',
  BITWISE_XOR = 'BITWISE_XOR',
  BITWISE_NOT = 'BITWISE_NOT',
  LEFT_SHIFT = 'LEFT_SHIFT',
  RIGHT_SHIFT = 'RIGHT_SHIFT',
  
  // 标点符号
  SEMICOLON = 'SEMICOLON',
  COMMA = 'COMMA',
  DOT = 'DOT',
  COLON = 'COLON',
  DOUBLE_COLON = 'DOUBLE_COLON',
  QUESTION = 'QUESTION',
  EXCLAMATION = 'EXCLAMATION',
  
  // 括号
  LEFT_PAREN = 'LEFT_PAREN',
  RIGHT_PAREN = 'RIGHT_PAREN',
  LEFT_BRACE = 'LEFT_BRACE',
  RIGHT_BRACE = 'RIGHT_BRACE',
  LEFT_BRACKET = 'LEFT_BRACKET',
  RIGHT_BRACKET = 'RIGHT_BRACKET',
  
  // 箭头和范围
  ARROW = 'ARROW',
  FAT_ARROW = 'FAT_ARROW',
  RANGE = 'RANGE',
  RANGE_INCLUSIVE = 'RANGE_INCLUSIVE',
  
  // 特殊
  NEWLINE = 'NEWLINE',
  EOF = 'EOF',
  
  // 模板字符串
  TEMPLATE_START = 'TEMPLATE_START',
  TEMPLATE_MIDDLE = 'TEMPLATE_MIDDLE',
  TEMPLATE_END = 'TEMPLATE_END',
  
  // 泛型
  GENERIC_START = 'GENERIC_START', // ::<
  GENERIC_END = 'GENERIC_END',     // >
  
  // 宏
  MACRO_CALL = 'MACRO_CALL', // @identifier
  
  // 元编程
  META_START = 'META_START', // <%
  META_END = 'META_END',     // %>
}

export interface Token {
  type: TokenType;
  value: string;
  location: Location;
  raw?: string; // 原始文本（用于字符串字面量）
}

export class LexerError extends Error {
  constructor(
    message: string,
    public location: Location
  ) {
    super(message);
    this.name = 'LexerError';
  }
}

export class Lexer {
  private source: string;
  private filename: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;
  private tokens: Token[] = [];
  
  // 关键字映射
  private keywords = new Map<string, TokenType>([
    ['let', TokenType.LET],
    ['mut', TokenType.MUT],
    ['const', TokenType.CONST],
    ['if', TokenType.IF],
    ['else', TokenType.ELSE],
    ['match', TokenType.MATCH],
    ['case', TokenType.CASE],
    ['fallthrough', TokenType.FALLTHROUGH],
    ['loop', TokenType.LOOP],
    ['label', TokenType.LABEL],
    ['break', TokenType.BREAK],
    ['continue', TokenType.CONTINUE],
    ['function', TokenType.FUNCTION],
    ['return', TokenType.RETURN],
    ['class', TokenType.CLASS],
    ['union', TokenType.UNION],
    ['trait', TokenType.TRAIT],
    ['impl', TokenType.IMPL],
    ['for', TokenType.FOR],
    ['in', TokenType.IN],
    ['yield', TokenType.YIELD],
    ['async', TokenType.ASYNC],
    ['await', TokenType.AWAIT],
    ['try', TokenType.TRY],
    ['handler', TokenType.HANDLER],
    ['with', TokenType.WITH],
    ['raise', TokenType.RAISE],
    ['resume', TokenType.RESUME],
    ['callcc', TokenType.CALLCC],
    ['type', TokenType.TYPE],
    ['macro', TokenType.MACRO],
    ['self', TokenType.SELF],
    ['this', TokenType.THIS],
    ['constructor', TokenType.CONSTRUCTOR],
    ['is', TokenType.IS],
    ['as', TokenType.AS],
    ['true', TokenType.BOOLEAN],
    ['false', TokenType.BOOLEAN],
    ['null', TokenType.NULL],
    ['undefined', TokenType.UNDEFINED],
  ]);

  constructor(source: string, filename: string = '<unknown>') {
    this.source = source;
    this.filename = filename;
  }

  tokenize(): Token[] {
    this.tokens = [];
    this.position = 0;
    this.line = 1;
    this.column = 1;

    while (!this.isAtEnd()) {
      this.scanToken();
    }

    this.addToken(TokenType.EOF, '');
    return this.tokens;
  }

  private scanToken(): void {
    const start = this.getCurrentPosition();
    const char = this.advance();

    switch (char) {
      // 空白字符
      case ' ':
      case '\r':
      case '\t':
        break;
      
      case '\n':
        this.addToken(TokenType.NEWLINE, '\n');
        this.line++;
        this.column = 1;
        break;

      // 单字符 token
      case '(':
        this.addToken(TokenType.LEFT_PAREN, char);
        break;
      case ')':
        this.addToken(TokenType.RIGHT_PAREN, char);
        break;
      case '{':
        this.addToken(TokenType.LEFT_BRACE, char);
        break;
      case '}':
        this.addToken(TokenType.RIGHT_BRACE, char);
        break;
      case '[':
        this.addToken(TokenType.LEFT_BRACKET, char);
        break;
      case ']':
        this.addToken(TokenType.RIGHT_BRACKET, char);
        break;
      case ',':
        this.addToken(TokenType.COMMA, char);
        break;
      case ';':
        this.addToken(TokenType.SEMICOLON, char);
        break;
      case '?':
        this.addToken(TokenType.QUESTION, char);
        break;
      case '~':
        this.addToken(TokenType.BITWISE_NOT, char);
        break;
      case '^':
        this.addToken(TokenType.BITWISE_XOR, char);
        break;

      // 可能是多字符的操作符
      case '+':
        if (this.match('=')) {
          this.addToken(TokenType.PLUS_ASSIGN, '+=');
        } else {
          this.addToken(TokenType.PLUS, char);
        }
        break;
      
      case '-':
        if (this.match('=')) {
          this.addToken(TokenType.MINUS_ASSIGN, '-=');
        } else if (this.match('>')) {
          this.addToken(TokenType.ARROW, '->');
        } else {
          this.addToken(TokenType.MINUS, char);
        }
        break;
      
      case '*':
        if (this.match('=')) {
          this.addToken(TokenType.MULTIPLY_ASSIGN, '*=');
        } else if (this.match('*')) {
          this.addToken(TokenType.POWER, '**');
        } else {
          this.addToken(TokenType.MULTIPLY, char);
        }
        break;
      
      case '/':
        if (this.match('=')) {
          this.addToken(TokenType.DIVIDE_ASSIGN, '/=');
        } else {
          this.addToken(TokenType.DIVIDE, char);
        }
        break;
      
      case '%':
        if (this.match('>')) {
          this.addToken(TokenType.META_END, '%>');
        } else {
          this.addToken(TokenType.MODULO, char);
        }
        break;
      
      case '=':
        if (this.match('=')) {
          this.addToken(TokenType.EQUAL, '==');
        } else if (this.match('>')) {
          this.addToken(TokenType.FAT_ARROW, '=>');
        } else {
          this.addToken(TokenType.ASSIGN, char);
        }
        break;
      
      case '!':
        if (this.match('=')) {
          this.addToken(TokenType.NOT_EQUAL, '!=');
        } else {
          this.addToken(TokenType.LOGICAL_NOT, char);
        }
        break;
      
      case '<':
        if (this.match('=')) {
          this.addToken(TokenType.LESS_EQUAL, '<=');
        } else if (this.match('<')) {
          this.addToken(TokenType.LEFT_SHIFT, '<<');
        } else if (this.match('#')) {
          this.skipMultiLineComment();
        } else if (this.match('%')) {
          this.addToken(TokenType.META_START, '<%');
        } else {
          this.addToken(TokenType.LESS_THAN, char);
        }
        break;
      
      case '>':
        if (this.match('=')) {
          this.addToken(TokenType.GREATER_EQUAL, '>=');
        } else if (this.match('>')) {
          this.addToken(TokenType.RIGHT_SHIFT, '>>');
        } else {
          this.addToken(TokenType.GREATER_THAN, char);
        }
        break;
      
      case '&':
        if (this.match('&')) {
          this.addToken(TokenType.LOGICAL_AND, '&&');
        } else {
          this.addToken(TokenType.BITWISE_AND, char);
        }
        break;
      
      case '|':
        if (this.match('|')) {
          this.addToken(TokenType.LOGICAL_OR, '||');
        } else {
          this.addToken(TokenType.BITWISE_OR, char);
        }
        break;
      
      case ':':
        if (this.match(':')) {
          if (this.match('<')) {
            this.addToken(TokenType.GENERIC_START, '::<');
          } else {
            this.addToken(TokenType.DOUBLE_COLON, '::');
          }
        } else {
          this.addToken(TokenType.COLON, char);
        }
        break;
      
      case '.':
        if (this.match('.')) {
          if (this.match('=')) {
            this.addToken(TokenType.RANGE_INCLUSIVE, '..=');
          } else {
            this.addToken(TokenType.RANGE, '..');
          }
        } else {
          this.addToken(TokenType.DOT, char);
        }
        break;
      
      case '#':
        if (this.match('>')) {
          // 这是多行注释的结束，但我们在这里不应该遇到它
          this.error('Unexpected end of multi-line comment');
        } else {
          // 单行注释
          this.skipSingleLineComment();
        }
        break;
      
      case '@':
        // 宏调用
        this.scanMacroCall();
        break;
      
      case '"':
      case "'":
        this.scanString(char);
        break;
      
      case '`':
        this.scanTemplateString();
        break;
      
      default:
        if (this.isDigit(char)) {
          this.scanNumber();
        } else if (this.isAlpha(char)) {
          this.scanIdentifier();
        } else {
          this.error(`Unexpected character: ${char}`);
        }
        break;
    }
  }

  private scanString(quote: string): void {
    const start = this.getCurrentPosition();
    let value = '';
    
    while (!this.isAtEnd() && this.peek() !== quote) {
      if (this.peek() === '\n') {
        this.line++;
        this.column = 1;
      }
      
      if (this.peek() === '\\') {
        this.advance(); // 跳过反斜杠
        const escaped = this.advance();
        
        switch (escaped) {
          case 'n': value += '\n'; break;
          case 't': value += '\t'; break;
          case 'r': value += '\r'; break;
          case '\\': value += '\\'; break;
          case '\'': value += '\''; break;
          case '"': value += '"'; break;
          case '0': value += '\0'; break;
          default:
            value += escaped;
            break;
        }
      } else {
        value += this.advance();
      }
    }
    
    if (this.isAtEnd()) {
      this.error('Unterminated string');
    }
    
    // 跳过结束引号
    this.advance();
    
    this.addToken(TokenType.STRING, value);
  }

  private scanTemplateString(): void {
    // 简化的模板字符串实现
    let value = '';
    
    while (!this.isAtEnd() && this.peek() !== '`') {
      if (this.peek() === '\n') {
        this.line++;
        this.column = 1;
      }
      value += this.advance();
    }
    
    if (this.isAtEnd()) {
      this.error('Unterminated template string');
    }
    
    // 跳过结束反引号
    this.advance();
    
    this.addToken(TokenType.STRING, value);
  }

  private scanNumber(): void {
    let value = '';
    
    // 整数部分
    while (this.isDigit(this.peek())) {
      value += this.advance();
    }
    
    // 小数部分
    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      value += this.advance(); // 消费 '.'
      
      while (this.isDigit(this.peek())) {
        value += this.advance();
      }
    }
    
    // 科学计数法
    if (this.peek() === 'e' || this.peek() === 'E') {
      value += this.advance();
      
      if (this.peek() === '+' || this.peek() === '-') {
        value += this.advance();
      }
      
      while (this.isDigit(this.peek())) {
        value += this.advance();
      }
    }
    
    this.addToken(TokenType.NUMBER, value);
  }

  private scanIdentifier(): void {
    let value = '';
    
    while (this.isAlphaNumeric(this.peek())) {
      value += this.advance();
    }
    
    const tokenType = this.keywords.get(value) || TokenType.IDENTIFIER;
    this.addToken(tokenType, value);
  }

  private scanMacroCall(): void {
    let value = '@';
    
    if (!this.isAlpha(this.peek())) {
      this.error('Expected identifier after @');
    }
    
    while (this.isAlphaNumeric(this.peek())) {
      value += this.advance();
    }
    
    this.addToken(TokenType.MACRO_CALL, value);
  }

  private skipSingleLineComment(): void {
    while (!this.isAtEnd() && this.peek() !== '\n') {
      this.advance();
    }
  }

  private skipMultiLineComment(): void {
    let depth = 1;
    
    while (!this.isAtEnd() && depth > 0) {
      if (this.peek() === '<' && this.peekNext() === '#') {
        this.advance();
        this.advance();
        depth++;
      } else if (this.peek() === '#' && this.peekNext() === '>') {
        this.advance();
        this.advance();
        depth--;
      } else {
        if (this.peek() === '\n') {
          this.line++;
          this.column = 1;
        }
        this.advance();
      }
    }
    
    if (depth > 0) {
      this.error('Unterminated multi-line comment');
    }
  }

  private isAtEnd(): boolean {
    return this.position >= this.source.length;
  }

  private advance(): string {
    const char = this.source[this.position++];
    if (char !== '\n') {
      this.column++;
    }
    return char;
  }

  private match(expected: string): boolean {
    if (this.isAtEnd() || this.source[this.position] !== expected) {
      return false;
    }
    
    this.position++;
    this.column++;
    return true;
  }

  private peek(): string {
    if (this.isAtEnd()) return '\0';
    return this.source[this.position];
  }

  private peekNext(): string {
    if (this.position + 1 >= this.source.length) return '\0';
    return this.source[this.position + 1];
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isAlpha(char: string): boolean {
    return (char >= 'a' && char <= 'z') ||
           (char >= 'A' && char <= 'Z') ||
           char === '_';
  }

  private isAlphaNumeric(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char);
  }

  private getCurrentPosition(): Position {
    return {
      line: this.line,
      column: this.column
    };
  }

  private addToken(type: TokenType, value: string): void {
    const location: Location = {
      start: this.getCurrentPosition(),
      end: {
        line: this.line,
        column: this.column + value.length
      },
      file: this.filename
    };
    
    this.tokens.push({
      type,
      value,
      location
    });
  }

  private error(message: string): never {
    const location: Location = {
      start: this.getCurrentPosition(),
      end: this.getCurrentPosition(),
      file: this.filename
    };
    
    throw new LexerError(message, location);
  }
}