import {CodeWithSourceMap, SourceNode} from "source-map";

export class CodeGenerator {
    private source: SourceNode;
    // TODO: classes
    // TODO: functions
    // TODO: variables

    constructor() {
        this.source = new SourceNode();
    }

    finish(): CodeWithSourceMap {
        return this.source.toStringWithSourceMap();
    }
}