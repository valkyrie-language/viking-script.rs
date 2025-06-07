import {CodeWithSourceMap, SourceNode} from "source-map";

export class CodeGenerator {
    private source: SourceNode;

    constructor() {
        this.source = new SourceNode();
    }

    finish(): CodeWithSourceMap {
        return this.source.toStringWithSourceMap();
    }
}