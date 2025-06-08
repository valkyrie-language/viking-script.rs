import {CodeWithSourceMap, SourceNode} from "source-map";
import {Location} from "viking-hir";

export class CodeGenerator {
    private source: SourceNode;
    private indentLevel = 0;
    // TODO: classes
    // TODO: functions
    // TODO: variables

    constructor() {
        this.indentLevel = 0;
        this.source = new SourceNode();
    }

    indent(): void {
        this.indentLevel++;
    }
    dedent(): void {
        this.indentLevel--;
    }

    writeText(text: string): void {
        this.source.add(text);
    }

    writeIdentifier(text: string, location: Location): void {
        this.source.add(new SourceNode(location.start.line, location.start.column, location.file, text, text));
    }

    finish(): CodeWithSourceMap {
        return this.source.toStringWithSourceMap();
    }
}