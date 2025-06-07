import {Position} from 'viking-hir';

// 解析器状态
export class ParseState {
    input: string;
    position: Position;
    errors: ParseError[];

    constructor(input: string, position: Position) {
        this.input = input;
        this.position = position;
        this.errors = [];
    }

    advance(text: string): void {
        for (const char of text) {
            this.position.offset++;
            if (char == '\n') {
                this.position.column = 1;
                this.position.line++;
            }
                // '\r' ignored here
            // '\t' only count as 1 column
            else {
                this.position.column++;
            }
        }
    }

    // todo: matchString
    // todo: matchRegex
}
