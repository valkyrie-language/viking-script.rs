export class Position {
    line: number;
    column: number;
    offset: number;

    constructor(line: number, column: number, offset: number) {
        this.line = line;
        this.column = column;
        this.offset = offset;
    }
}

export class Location {
    start: Position;
    end: Position;
    file: string;

    constructor(start: Position, end: Position, file: string = "<anonymous>") {
        this.start = start;
        this.end = end;
        this.file = file;
    }
}

// 解析错误
export class ParseError {
    message: string;
    position: Position;
    expected?: string[];
    actual?: string;

    constructor(message: string, position: Position, expected?: string[], actual?: string) {
        this.message = message;
        this.position = position;
        this.expected = expected;
        this.actual = actual;
    }
}