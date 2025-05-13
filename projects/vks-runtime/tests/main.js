import { test, expect } from 'vitest';
import { createHandler, runWithHandler, createEffect, raise } from './index.ts';

// 定义测试效应
const useState = createEffect('use_state');
const logEffect = createEffect('log_effect');
const myError = createEffect('my_error');
const outerEffect = createEffect('outer_effect');
const innerEffect = createEffect('inner_effect');
const sharedEffect = createEffect('shared_effect');
const getCounter = createEffect('get_counter');

// 测试基本效应和处理器
test('测试基本效应和处理器', () => {
    const handler = createHandler({
        'use_state': (resume) => resume(0),
        'log_effect': (resume, message) => {
            expect(message).toBe('log effect');
            return resume();
        },
        'my_error': () => {
            throw new Error('Unhandled my_error');
        }
    });

    const result = runWithHandler(() => {
        const count = useState();
        logEffect('log effect');
        try {
            myError();
        } catch (e) {
            expect(e.message).toBe('Unhandled my_error');
        }
        return count;
    }, handler);

    expect(result).toBe(0);
});

// 测试嵌套效应处理器
test('测试嵌套效应处理器', () => {
    const outerHandler = createHandler({
        'outer_effect': (resume, value) => resume(value * 2),
        'shared_effect': (resume, value) => resume(value + 10)
    });

    const innerHandler = createHandler({
        'inner_effect': (resume, value) => resume(value * 3),
        'shared_effect': (resume, value) => resume(value + 5)
    });

    const result = runWithHandler(() => {
        const outer = outerEffect(2);

        const inner = runWithHandler(() => {
            const innerResult = innerEffect(3);
            const shared1 = sharedEffect(1);
            return innerResult + shared1;
        }, innerHandler);

        const shared2 = sharedEffect(2);
        return outer + inner + shared2;
    }, outerHandler);

    expect(result).toBe(31);
});

// 测试效应恢复
test('测试效应恢复', () => {
    const counterHandler = createHandler({
        'get_counter': (resume) => {
            let count = 0;
            const result1 = resume(count++);
            const result2 = resume(count++);
            const result3 = resume(count++);
            return [result1, result2, result3];
        }
    });

    const result = runWithHandler(() => {
        const a = getCounter();
        const b = getCounter();
        const c = getCounter();
        return [a, b, c];
    }, counterHandler);

    expect(result).toEqual([[0, 1, 2]]);
});