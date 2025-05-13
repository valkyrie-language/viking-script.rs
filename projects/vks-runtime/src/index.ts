/**
 * @fileoverview 代数效应运行时实现
 */

/**
 * 效应类型定义
 * @typedef {Object} Effect
 * @property {string} type - 效应类型名称
 * @property {any[]} args - 效应参数
 */

/**
 * 效应处理器类型定义
 * @typedef {Object} Handler
 * @property {Object.<string, Function>} cases - 处理不同类型效应的函数映射
 */

/**
 * 效应上下文，用于跟踪当前活动的处理器
 * @type {Array<Handler>}
 */
let activeHandlers = [];

/**
 * 抛出一个效应
 * @param {string} type - 效应类型
 * @param {...any} args - 效应参数
 * @returns {any} - 处理器返回的结果
 * @throws {Error} - 如果没有找到匹配的处理器
 */
export function raise(type, ...args) {
    // 从最近的处理器开始查找
    for (let i = activeHandlers.length - 1; i >= 0; i--) {
        const handler = activeHandlers[i];
        const handlerCase = handler.cases[type];

        if (handlerCase) {
            // 创建恢复函数
            const resumeFunction = (result) => {
                // 恢复执行点，返回结果
                return result;
            };

            // 调用处理器
            return handlerCase(resumeFunction, ...args);
        }
    }

    throw new Error(`未处理的效应: ${type}`);
}

/**
 * 创建一个生成器函数，用于执行带有效应的代码
 * @param {Function} fn - 要执行的函数
 * @returns {Generator} - 生成器
 */
export function* effectful(fn) {
    try {
        return yield* fn();
    } catch (effect) {
        if (typeof effect === 'object' && effect !== null && 'type' in effect) {
            // 这是一个效应，让外部处理器处理
            yield effect;
        } else {
            // 这是一个普通错误，重新抛出
            throw effect;
        }
    }
}

/**
 * 运行带有效应的函数
 * @param {Function} fn - 要执行的函数
 * @param {Handler} handler - 效应处理器
 * @returns {any} - 函数的返回值
 */
export function runWithHandler(fn, handler) {
    // 添加处理器到活动堆栈
    activeHandlers.push(handler);

    try {
        // 创建并运行生成器
        const generator = effectful(fn);
        let result = generator.next();

        // 处理生成器产生的效应
        while (!result.done) {
            const effect = result.value;

            // 查找处理器
            const handlerCase = handler.cases[effect.type];
            if (!handlerCase) {
                throw new Error(`未处理的效应: ${effect.type}`);
            }

            // 创建恢复函数
            const resumeFunction = (resumeValue) => {
                // 恢复生成器执行
                result = generator.next(resumeValue);
                return result.value;
            };

            // 调用处理器
            const handlerResult = handlerCase(resumeFunction, ...effect.args);

            // 如果处理器没有恢复，则返回处理器的结果
            if (result.done) {
                return handlerResult;
            }
        }

        // 返回生成器的最终结果
        return result.value;
    } finally {
        // 移除处理器
        activeHandlers.pop();
    }
}

/**
 * 创建效应处理器
 * @param {Object.<string, Function>} cases - 处理不同类型效应的函数映射
 * @returns {Handler} - 效应处理器
 */
export function createHandler(cases) {
    return {cases};
}

/**
 * 创建一个效应
 * @param {string} type - 效应类型
 * @returns {Function} - 效应函数
 */
export function createEffect(type) {
    return (...args) => raise(type, ...args);
}

// 示例效应
export const useState = createEffect('use_state');
export const logEffect = createEffect('log_effect');
export const myError = createEffect('my_error');

// 测试用例
export function runTest() {
    const handler = createHandler({
        'use_state': (resume) => resume(0),
        'log_effect': (resume, message) => {
            console.log('real log: ' + message);
            return resume();
        },
        'my_error': () => {
            throw new Error('Unhandled my_error');
        }
    });

    return runWithHandler(() => {
        // 测试代码
        const count = useState();
        logEffect('log effect');
        try {
            myError();
        } catch (e) {
            console.log('Caught error:', e);
        }
        return count;
    }, handler);
}