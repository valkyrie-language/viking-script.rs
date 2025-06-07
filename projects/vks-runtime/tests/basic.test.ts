import { describe, it, expect } from 'vitest';
import { VikingVM } from '../src/vm';
import { EffectSystem } from '../src/effects';

describe('VikingVM basic functionality', () => {
  it('should execute a simple program with variable declarations and function calls', async () => {
    const code = `
let name = "Viking";
function greet(name: string) -> string {
    return "Hello, " + name + "!";
}
function main() {
    let message = greet(name);
    print(message);
}
`;
    const vm = new VikingVM();
    const effectSystem = new EffectSystem();
    let printedMessage = '';

    effectSystem.registerEffectHandler('Log', async (effect) => {
      printedMessage = effect.args[0];
      return null;
    });

    await vm.runAwait(code, effectSystem);
    expect(printedMessage).toBe('Hello, Viking!');
  });

  it('should handle class instantiation and method calls', async () => {
    const code = `
class Counter {
    value: number = 0;
    constructor(initial: number) {
        self.value = initial;
    }
    increment() {
        self.value = self.value + 1;
    }
    get_value() -> number {
        return self.value;
    }
}
function main() {
    let counter = Counter(10);
    counter.increment();
    print("Counter value: " + counter.get_value());
}
`;
    const vm = new VikingVM();
    const effectSystem = new EffectSystem();
    let printedMessage = '';

    effectSystem.registerEffectHandler('Log', async (effect) => {
      printedMessage = effect.args[0];
      return null;
    });

    await vm.runAwait(code, effectSystem);
    expect(printedMessage).toBe('Counter value: 11');
  });

  it('should handle union types and pattern matching', async () => {
    const code = `
union Result<T, E> {
    Ok { value: T }
    Err { error: E }
}
function handle_result(result: Result<number, string>) {
    match result {
        case Ok { value }:
            print("Success: " + value);
        case Err { error }:
            print("Error: " + error);
    }
}
function main() {
    let success = Result::Ok { value: 42 };
    let failure = Result::Err { error: "Something went wrong" };
    handle_result(success);
    handle_result(failure);
}
`;
    const vm = new VikingVM();
    const effectSystem = new EffectSystem();
    const printedMessages: string[] = [];

    effectSystem.registerEffectHandler('Log', async (effect) => {
      printedMessages.push(effect.args[0]);
      return null;
    });

    await vm.runAwait(code, effectSystem);
    expect(printedMessages).toEqual(['Success: 42', 'Error: Something went wrong']);
  });

  it('should handle loops with break statements', async () => {
    const code = `
let mut count = 0;
function main() {
    loop {
        if count >= 3 {
            break;
        }
        print("Count: " + count);
        count = count + 1;
    }
}
`;
    const vm = new VikingVM();
    const effectSystem = new EffectSystem();
    const printedMessages: string[] = [];

    effectSystem.registerEffectHandler('Log', async (effect) => {
      printedMessages.push(effect.args[0]);
      return null;
    });

    await vm.runAwait(code, effectSystem);
    expect(printedMessages).toEqual(['Count: 0', 'Count: 1', 'Count: 2']);
  });
});