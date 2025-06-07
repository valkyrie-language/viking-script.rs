/**
 * Viking Script Algebraic Effects System
 * 提供代数效应的核心实现
 */

/**
 * 效应类型定义
 */
class Effect {
    public type: string;
    public data: Record<string, any>;
    public timestamp: number;
    public id: string;

    constructor(type: string, data: Record<string, any> = {}) {
        this.type = type;
        this.data = data;
        this.timestamp = Date.now();
        this.id = Effect.generateId();
    }

    static generateId(): string {
        return Math.random().toString(36).substr(2, 9);
    }

    toString(): string {
        return `Effect(${this.type}, ${JSON.stringify(this.data)})`;
    }
}

/**
 * 预定义的效应类型
 */
class DivideByZeroError extends Effect {
    constructor() {
        super('DivideByZeroError', {});
    }
}

class Log extends Effect {
    constructor(message: string, level: string = 'info') {
        super('Log', {message, level});
    }
}

class FileNotFound extends Effect {
    constructor(filename: string) {
        super('FileNotFound', {filename});
    }
}

class NetworkError extends Effect {
    constructor(url: string, error: any) {
        super('NetworkError', {url, error});
    }
}

class StateRead extends Effect {
    constructor(key: string) {
        super('StateRead', {key});
    }
}

class StateWrite extends Effect {
    constructor(key: string, value: any) {
        super('StateWrite', {key, value});
    }
}

class AsyncOperation extends Effect {
    constructor(operation: Function, args: any[] = []) {
        super('AsyncOperation', {operation, args});
    }
}

/**
 * 效应处理器
 */
interface HandlerCase {
    pattern: any;
    action: (effect: Effect, resume: (value: any) => any, k: Function, h: EffectHandler | null) => any;
}

class EffectHandler {
    public cases: HandlerCase[];
    public parent: EffectHandler | null;
    public id: string;

    constructor(cases: HandlerCase[] = [], parent: EffectHandler | null = null) {
        this.cases = cases;
        this.parent = parent;
        this.id = Effect.generateId();
    }

    /**
     * 添加处理案例
     */
    addCase(pattern: any, action: (effect: Effect, resume: (value: any) => any, k: Function, h: EffectHandler | null) => any): EffectHandler {
        this.cases.push({pattern, action});
        return this;
    }

    /**
     * 查找匹配的处理案例
     */
    findMatchingCase(effect: Effect): HandlerCase | null {
        for (const handlerCase of this.cases) {
            if (this.matchPattern(effect, handlerCase.pattern)) {
                return handlerCase;
            }
        }
        return null;
    }

    /**
     * 模式匹配
     */
    matchPattern(effect: Effect, pattern: any): boolean {
        // 函数模式
        if (typeof pattern === 'function') {
            return pattern(effect);
        }

        // 字符串模式（匹配效应类型）
        if (typeof pattern === 'string') {
            return effect.type === pattern;
        }

        // 类模式
        if (typeof pattern === 'function' && effect instanceof pattern) {
            return true;
        }

        // 对象模式
        if (typeof pattern === 'object' && pattern !== null) {
            if (pattern.type && effect.type !== pattern.type) {
                return false;
            }

            for (const key in pattern) {
                if (key !== 'type' && effect.data[key] !== pattern[key]) {
                    return false;
                }
            }
            return true;
        }

        // 直接相等
        return effect === pattern;
    }

    /**
     * 创建子处理器
     */
    extend(cases: HandlerCase[] = []): EffectHandler {
        return new EffectHandler(cases, this);
    }
}

/**
 * 效应系统核心
 */
class EffectSystem {
    constructor() {
        this.defaultHandler = this.createDefaultHandler();
        this.handlerStack = [this.defaultHandler];
    }

    /**
     * 创建默认处理器
     */
    createDefaultHandler() {
        return new EffectHandler([
            {
                pattern: () => true, // 匹配所有未处理的效应
                action: (effect, resume, k, h) => {
                    console.error('Unhandled effect:', effect.toString());
                    throw new Error(`Unhandled effect: ${effect.type}`);
                }
            }
        ]);
    }

    /**
     * 抛出效应
     */
    raise(effect, k, h) {
        if (!(effect instanceof Effect)) {
            effect = new Effect('Unknown', {value: effect});
        }

        console.log(`Raising effect: ${effect.toString()}`);

        // 在处理器栈中查找匹配的处理器
        let currentHandler = h;

        while (currentHandler) {
            const matchingCase = currentHandler.findMatchingCase(effect);

            if (matchingCase) {
                console.log(`Found handler for effect: ${effect.type}`);

                // 创建 resume continuation
                const resume = (value) => {
                    console.log(`Resuming with value:`, value);
                    return k(value, h);
                };

                // 执行处理器
                return matchingCase.action(effect, resume, k, currentHandler.parent || this.defaultHandler);
            }

            currentHandler = currentHandler.parent;
        }

        // 没有找到处理器，使用默认处理器
        console.log(`No handler found for effect: ${effect.type}, using default`);
        const defaultCase = this.defaultHandler.cases[0];
        const resume = (value) => k(value, h);
        return defaultCase.action(effect, resume, k, this.defaultHandler);
    }

    /**
     * 使用处理器执行代码块
     */
    withHandler(handlerConfig, block, k, h) {
        // 创建新的处理器
        const newHandler = new EffectHandler(handlerConfig.cases || [], h);

        console.log(`Installing new handler with ${newHandler.cases.length} cases`);

        // 执行代码块
        try {
            return block(undefined, k, newHandler);
        } catch (error) {
            // 将异常转换为效应
            const effect = new Effect('Exception', {error});
            return this.raise(effect, k, h);
        }
    }

    /**
     * 创建预制处理器
     */
    createPresetHandler(name, ...args) {
        switch (name) {
            case 'div_fix':
                return this.createDivFixHandler(args[0] || 0);

            case 'log_handler':
                return this.createLogHandler(args[0] || console.log);

            case 'state_handler':
                return this.createStateHandler(args[0] || {});

            case 'async_handler':
                return this.createAsyncHandler();

            default:
                throw new Error(`Unknown preset handler: ${name}`);
        }
    }

    /**
     * 除零错误处理器
     */
    createDivFixHandler(defaultValue) {
        return {
            cases: [
                {
                    pattern: 'DivideByZeroError',
                    action: (effect, resume, k, h) => {
                        console.log(`Handling divide by zero, returning default: ${defaultValue}`);
                        return resume(defaultValue);
                    }
                }
            ]
        };
    }

    /**
     * 日志处理器
     */
    createLogHandler(logFunction = console.log) {
        return {
            cases: [
                {
                    pattern: 'Log',
                    action: (effect, resume, k, h) => {
                        const {message, level} = effect.data;
                        logFunction(`[${level.toUpperCase()}] ${message}`);
                        return resume(undefined);
                    }
                }
            ]
        };
    }

    /**
     * 状态处理器
     */
    createStateHandler(initialState = {}) {
        const state = {...initialState};

        return {
            cases: [
                {
                    pattern: 'StateRead',
                    action: (effect, resume, k, h) => {
                        const {key} = effect.data;
                        const value = state[key];
                        console.log(`State read: ${key} = ${value}`);
                        return resume(value);
                    }
                },
                {
                    pattern: 'StateWrite',
                    action: (effect, resume, k, h) => {
                        const {key, value} = effect.data;
                        state[key] = value;
                        console.log(`State write: ${key} = ${value}`);
                        return resume(value);
                    }
                }
            ]
        };
    }

    /**
     * 异步操作处理器
     */
    createAsyncHandler() {
        return {
            cases: [
                {
                    pattern: 'AsyncOperation',
                    action: async (effect, resume, k, h) => {
                        const {operation, args} = effect.data;

                        try {
                            const result = await operation(...args);
                            return resume(result);
                        } catch (error) {
                            const errorEffect = new Effect('AsyncError', {error, operation: operation.name});
                            return this.raise(errorEffect, k, h);
                        }
                    }
                }
            ]
        };
    }

    /**
     * 调试处理器
     */
    createDebugHandler(label = 'debug') {
        return {
            cases: [
                {
                    pattern: () => true, // 匹配所有效应
                    action: (effect, resume, k, h) => {
                        console.log(`[${label}] Effect intercepted:`, effect.toString());
                        // 继续传播到下一个处理器
                        return this.raise(effect, k, h.parent);
                    }
                }
            ]
        };
    }

    /**
     * 组合多个处理器
     */
    combineHandlers(...handlers) {
        const combinedCases = [];

        for (const handler of handlers) {
            if (handler.cases) {
                combinedCases.push(...handler.cases);
            }
        }

        return {
            cases: combinedCases
        };
    }

    /**
     * 获取当前处理器栈信息
     */
    getHandlerStackInfo(h) {
        const info = [];
        let current = h;

        while (current) {
            info.push({
                id: current.id,
                casesCount: current.cases.length,
                cases: current.cases.map(c => c.pattern.toString())
            });
            current = current.parent;
        }

        return info;
    }
}

// 创建全局效应系统实例
const effectSystem = new EffectSystem();

// 导出效应系统和相关类
module.exports = {
    Effects: effectSystem,
    Effect,
    EffectHandler,

    // 预定义效应类型
    DivideByZeroError,
    Log,
    FileNotFound,
    NetworkError,
    StateRead,
    StateWrite,
    AsyncOperation,

    // 便捷函数
    raise: (effect, k, h) => effectSystem.raise(effect, k, h),
    withHandler: (handler, block, k, h) => effectSystem.withHandler(handler, block, k, h),
    createHandler: (cases, parent) => new EffectHandler(cases, parent),
    createPresetHandler: (name, ...args) => effectSystem.createPresetHandler(name, ...args),

    // 工厂函数
    divideByZero: () => new DivideByZeroError(),
    log: (message, level) => new Log(message, level),
    fileNotFound: (filename) => new FileNotFound(filename),
    networkError: (url, error) => new NetworkError(url, error),
    stateRead: (key) => new StateRead(key),
    stateWrite: (key, value) => new StateWrite(key, value),
    asyncOp: (operation, args) => new AsyncOperation(operation, args)
};