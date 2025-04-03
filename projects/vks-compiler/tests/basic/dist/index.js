(function(global, factory) {
	typeof exports === "object" && typeof module !== "undefined" ? factory(exports) : typeof define === "function" && define.amd ? define(["exports"], factory) : (global = typeof globalThis !== "undefined" ? globalThis : global || self, factory(global.ttt = {}));
})(this, function(exports) {
	"use strict";
	let E = /* @__PURE__ */ function(E$1) {
		E$1[E$1["A"] = 1] = "A";
		E$1[E$1["B"] = 2] = "B";
		E$1[E$1["C"] = 3] = "C";
		return E$1;
	}({});
	const a = 1;
	function b() {
		return a + 1;
	}
	exports.E = E;
	exports.a = a;
	exports.b = b;
});

//# sourceMappingURL=index.js.map