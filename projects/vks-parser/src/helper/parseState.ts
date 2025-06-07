// 解析器状态
import {Location, ParseError, Position} from "viking-hir";

export class ParseState {
    private readonly input: string;
    position: Position;
    errors: ParseError[];
    file: string;

    constructor(input: string, position?: Position, file?: string) {
        this.input = input;
        this.position = position || new Position(1, 1, 0);
        this.errors = [];
        this.file = file || "<anonymous>";
    }

    get residual(): string {
        return this.input.slice(this.position.offset, this.input.length);
    }

    clone(): ParseState {
        const newState = new ParseState(this.input, this.position, this.file);
        newState.errors = [...this.errors];
        return newState;
    }

    advance(text: string): void {
        for (const char of text) {
            this.position.offset++;
            if (char === '\n') {
                this.position.column = 1;
                this.position.line++;
            } else if (char !== '\r') {
                this.position.column++;
            }
        }
    }

    peek(length: number = 1): string {
        return this.input.slice(this.position.offset, this.position.offset + length);
    }

    notEof(): boolean {
        return this.position.offset < this.input.length;
    }

    addError(message: string, expected?: string[], actual?: string): void {
        this.errors.push(new ParseError(message, this.position, expected, actual));
    }

    createLocation(start: Position): Location {
        return new Location(start, this.position, this.file);
    }
}