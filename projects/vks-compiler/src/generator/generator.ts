import {CodeWithSourceMap, SourceNode} from "source-map";


class CodeGenerator {
    source: SourceNode

    finish(): CodeWithSourceMap {
        return this.source.toStringWithSourceMap()
    }
}