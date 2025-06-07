/**
 * Viking Script Runtime Virtual Machine
 * 提供 CPS 执行环境和基础运行时支持
 */

class VikingVM {
    constructor() {
        this.defaultHandler = this.createDefaultHandler();
        this.globalContext = this.createGlobalContext();
    }

    /**
     * 运行 Viking 程序
     * @param {Function} mainFunction - CPS 形式的主函数 (value, k, h) => {}
     * @param {Object} options - 运行选项
     */
    run(mainFunction, options = {}) {
        if (typeof mainFunction !== 'function') {
            throw new Error('Main function must be a function');
        }

        console.log('Starting Viking program...');

        // 创建程序结束的 continuation
        const finalContinuation = (result, handler) => {
            console.log('Program completed with result:', result);
            if (options.onComplete) {
                options.onComplete(result);
            }
        };

        // 创建初始处理器栈
        const initialHandler = options.handler || this.defaultHandler;

        try {
            // 启动程序：mainFunction(undefined, finalContinuation, initialHandler)
            mainFunction(undefined, finalContinuation, initialHandler);
        } catch (error) {
            console.error('Runtime error:', error);
            if (options.onError) {
                options.onError(error);
            } else {
                throw error;
            }
        }
    }

    /**
     * 创建默认的效应处理器
     */
    createDefaultHandler() {
        return {
            cases: [
                {
                    // 处理未捕获的效应
                    pattern: () => true, // 匹配所有效应
                    action: (effect, resume, k, h) => {
                        console.error('Unhandled effect:', effect);
                        throw new Error(`Unhandled effect: ${effect.type || effect}`);
                    }
                }
            ],
            parent: null
        };
    }

    /**
     * 创建全局上下文
     */
    createGlobalContext() {
        return {
            // 内置函数
            print: (...args) => {
                console.log(...args);
            },

            // 异步睡眠函数
            sleep: (ms) => {
                return new Promise(resolve => setTimeout(resolve, ms));
            },

            // 类型检查函数
            typeof: (value) => typeof value,
            instanceof: (value, constructor) => value instanceof constructor
        };
    }

    /**
     * 处理 yield 表达式
     * @param {*} value - yield 的值
     * @param {Function} k - continuation
     * @param {Object} h - handler stack
     * @param {boolean} delegate - 是否是 yield from
     */
    runYield(value, k, h, delegate = false) {
        if (delegate) {
            // yield from: 委托给另一个生成器
            if (value && typeof value.next === 'function') {
                return this.delegateToGenerator(value, k, h);
            } else {
                throw new Error('yield from requires an iterable');
            }
        } else {
            // 普通 yield
            return {
                type: 'yield',
                value: value,
                next: (nextValue) => k(nextValue, h)
            };
        }
    }

    /**
     * 处理 await 表达式
     * @param {Promise} promise - 要等待的 Promise
     * @param {Function} k - continuation
     * @param {Object} h - handler stack
     */
    async runAwait(promise, k, h) {
        try {
            const result = await Promise.resolve(promise);
            return k(result, h);
        } catch (error) {
            // 将异常转换为效应
            const effect = {
                type: 'AsyncError',
                error: error,
                source: 'await'
            };
            return this.raiseEffect(effect, k, h);
        }
    }

    /**
     * 委托给生成器
     */
    delegateToGenerator(generator, k, h) {
        const iterate = (value) => {
            try {
                const result = generator.next(value);
                if (result.done) {
                    return k(result.value, h);
                } else {
                    return {
                        type: 'yield',
                        value: result.value,
                        next: iterate
                    };
                }
            } catch (error) {
                const effect = {
                    type: 'GeneratorError',
                    error: error,
                    source: 'yield_from'
                };
                return this.raiseEffect(effect, k, h);
            }
        };

        return iterate();
    }

    /**
     * 抛出效应
     * @param {Object} effect - 效应对象
     * @param {Function} k - continuation
     * @param {Object} h - handler stack
     */
    raiseEffect(effect, k, h) {
        // 在处理器栈中查找匹配的处理器
        let currentHandler = h;

        while (currentHandler) {
            for (const handlerCase of currentHandler.cases) {
                if (this.matchPattern(effect, handlerCase.pattern)) {
                    // 找到匹配的处理器
                    const resume = (value) => k(value, h);
                    return handlerCase.action(effect, resume, k, currentHandler.parent || this.defaultHandler);
                }
            }
            currentHandler = currentHandler.parent;
        }

        // 没有找到处理器，使用默认处理器
        const defaultCase = this.defaultHandler.cases[0];
        const resume = (value) => k(value, h);
        return defaultCase.action(effect, resume, k, this.defaultHandler);
    }

    /**
     * 模式匹配
     * @param {Object} effect - 效应对象
     * @param {*} pattern - 模式
     */
    matchPattern(effect, pattern) {
        if (typeof pattern === 'function') {
            return pattern(effect);
        }

        if (typeof pattern === 'string') {
            return effect.type === pattern;
        }

        if (typeof pattern === 'object' && pattern !== null) {
            // 对象模式匹配
            for (const key in pattern) {
                if (effect[key] !== pattern[key]) {
                    return false;
                }
            }
            return true;
        }

        return effect === pattern;
    }

    /**
     * 创建新的处理器栈
     * @param {Array} cases - 处理器案例
     * @param {Object} parent - 父处理器
     */
    createHandler(cases, parent) {
        return {
            cases: cases,
            parent: parent
        };
    }

    /**
     * 执行带处理器的代码块
     * @param {Object} handler - 处理器
     * @param {Function} block - 代码块函数
     * @param {Function} k - continuation
     * @param {Object} h - 当前处理器栈
     */
    withHandler(handler, block, k, h) {
        const newHandler = this.createHandler(handler.cases, h);
        return block(undefined, k, newHandler);
    }

    /**
     * 类型断言
     * @param {*} value - 要检查的值
     * @param {*} type - 类型
     */
    isType(value, type) {
        if (typeof type === 'string') {
            return typeof value === type;
        }

        if (typeof type === 'function') {
            return value instanceof type;
        }

        // 复杂类型检查
        if (type && type._vikingType) {
            return this.checkVikingType(value, type);
        }

        return false;
    }

    /**
     * Viking 类型检查
     */
    checkVikingType(value, type) {
        switch (type.kind) {
            case 'Union':
                return type.variants.some(variant =>
                    value._vikingType === variant ||
                    (value.constructor && value.constructor.name === variant)
                );

            case 'Trait':
                return value._vikingTraits && value._vikingTraits.includes(type.name);

            default:
                return value._vikingType === type.name;
        }
    }

    /**
     * 创建 Union 类型实例
     */
    createUnion(typeName, variant, data) {
        const instance = Object.assign({}, data);
        instance._vikingType = variant;
        instance._vikingUnion = typeName;
        return instance;
    }

    /**
     * 模式匹配解构
     */
    matchPattern(value, pattern) {
        if (pattern.type === 'Wildcard') {
            return {matched: true, bindings: {}};
        }

        if (pattern.type === 'Literal') {
            return {matched: value === pattern.value, bindings: {}};
        }

        if (pattern.type === 'Identifier') {
            return {matched: true, bindings: {[pattern.name]: value}};
        }

        if (pattern.type === 'Type') {
            const matched = this.isType(value, pattern.typeAnnotation);
            return {matched, bindings: matched ? {} : {}};
        }

        if (pattern.type === 'Destructure') {
            if (value._vikingType !== pattern.typeName) {
                return {matched: false, bindings: {}};
            }

            const bindings = {};
            for (const field of pattern.fields) {
                const fieldResult = this.matchPattern(value[field.name], field.pattern);
                if (!fieldResult.matched) {
                    return {matched: false, bindings: {}};
                }
                Object.assign(bindings, fieldResult.bindings);
            }

            return {matched: true, bindings};
        }

        return {matched: false, bindings: {}};
    }
}

// 创建全局 VM 实例
const vm = new VikingVM();

// 导出 VM 和相关函数
module.exports = {
    VM: vm,
    run: (mainFunction, options) => vm.run(mainFunction, options),
    runYield: (value, k, h, delegate) => vm.runYield(value, k, h, delegate),
    runAwait: (promise, k, h) => vm.runAwait(promise, k, h),
    createHandler: (cases, parent) => vm.createHandler(cases, parent),
    withHandler: (handler, block, k, h) => vm.withHandler(handler, block, k, h),
    isType: (value, type) => vm.isType(value, type),
    createUnion: (typeName, variant, data) => vm.createUnion(typeName, variant, data),
    matchPattern: (value, pattern) => vm.matchPattern(value, pattern)
};