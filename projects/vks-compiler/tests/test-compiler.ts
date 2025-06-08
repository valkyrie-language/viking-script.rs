// 编译器测试脚本
import * as fs from 'fs';
import * as path from 'path';
import {
    compile,
    compileFile,
    compileString,
    checkSyntax,
    checkTypes,
    getCompilerInfo,
    CompileOptions
} from '../src';

// 测试配置
const TEST_FILE = path.join(__dirname, 'simple.viking');
const OUTPUT_DIR = path.join(__dirname, 'output');

// 确保输出目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 测试函数
async function runTests() {
    console.log('🚀 Viking Script Compiler Tests\n');
    
    // 显示编译器信息
    console.log('📋 Compiler Info:');
    const compilerInfo = getCompilerInfo();
    console.log(JSON.stringify(compilerInfo, null, 2));
    console.log();
    
    // 测试 1: 语法检查
    console.log('🔍 Test 1: Syntax Check');
    const validCode = 'let x = 42; print(x);';
    const invalidCode = 'let x = ; print(x';
    
    const syntaxResult1 = checkSyntax(validCode);
    console.log(`Valid code syntax check: ${syntaxResult1.valid ? '✅ PASS' : '❌ FAIL'}`);
    
    const syntaxResult2 = checkSyntax(invalidCode);
    console.log(`Invalid code syntax check: ${!syntaxResult2.valid ? '✅ PASS' : '❌ FAIL'}`);
    if (!syntaxResult2.valid) {
        console.log('  Errors:', syntaxResult2.errors.map(e => e.message));
    }
    console.log();
    
    // 测试 2: 类型检查
    console.log('🔍 Test 2: Type Check');
    const typeValidCode = 'let x: number = 42; let y: string = "hello";';
    const typeInvalidCode = 'let x: number = "hello";';
    
    const typeResult1 = checkTypes(typeValidCode);
    console.log(`Valid type code check: ${typeResult1.valid ? '✅ PASS' : '❌ FAIL'}`);
    
    const typeResult2 = checkTypes(typeInvalidCode);
    console.log(`Invalid type code check: ${!typeResult2.valid ? '✅ PASS' : '❌ FAIL'}`);
    if (!typeResult2.valid) {
        console.log('  Errors:', typeResult2.errors.map(e => e.message));
    }
    console.log();
    
    // 测试 3: 简单代码编译
    console.log('🔧 Test 3: Simple Code Compilation');
    const simpleCode = `
        let x = 10;
        let y = 20;
        let result = x + y;
        print("Result: " + result);
    `;
    
    const compileOptions: CompileOptions = {
        sourceMap: true,
        minify: false,
        target: 'es2017',
        runtime: 'node',
        optimize: true,
        typeCheck: true
    };
    
    const simpleResult = compileString(simpleCode, 'simple.viking', compileOptions);
    
    if (simpleResult.errors && simpleResult.errors.length > 0) {
        console.log('❌ Compilation failed:');
        simpleResult.errors.forEach(error => {
            console.log(`  ${error.type}: ${error.message}`);
        });
    } else {
        console.log('✅ Simple compilation successful');
        
        // 保存编译结果
        const outputFile = path.join(OUTPUT_DIR, 'simple.js');
        fs.writeFileSync(outputFile, simpleResult.code);
        console.log(`  Output saved to: ${outputFile}`);
        
        if (simpleResult.sourceMap) {
            const mapFile = path.join(OUTPUT_DIR, 'simple.js.map');
            fs.writeFileSync(mapFile, simpleResult.sourceMap);
            console.log(`  Source map saved to: ${mapFile}`);
        }
    }
    console.log();
    
    // 测试 4: 文件编译
    console.log('🔧 Test 4: File Compilation');
    
    if (fs.existsSync(TEST_FILE)) {
        const fileContent = fs.readFileSync(TEST_FILE, 'utf-8');
        const fileResult = compileFile(TEST_FILE, fileContent, compileOptions);
        
        if (fileResult.errors && fileResult.errors.length > 0) {
            console.log('❌ File compilation failed:');
            fileResult.errors.forEach(error => {
                console.log(`  ${error.type}: ${error.message}`);
            });
        } else {
            console.log('✅ File compilation successful');
            
            // 保存编译结果
            const outputFile = path.join(OUTPUT_DIR, 'simple-file.js');
            fs.writeFileSync(outputFile, fileResult.code);
            console.log(`  Output saved to: ${outputFile}`);
            
            if (fileResult.sourceMap) {
                const mapFile = path.join(OUTPUT_DIR, 'simple-file.js.map');
                fs.writeFileSync(mapFile, fileResult.sourceMap);
                console.log(`  Source map saved to: ${mapFile}`);
            }
        }
        
        if (fileResult.warnings && fileResult.warnings.length > 0) {
            console.log('⚠️  Warnings:');
            fileResult.warnings.forEach(warning => {
                console.log(`  ${warning.type}: ${warning.message}`);
            });
        }
    } else {
        console.log(`❌ Test file not found: ${TEST_FILE}`);
    }
    console.log();
    
    // 测试 5: 多文件编译
    console.log('🔧 Test 5: Multi-file Compilation');
    
    const files = [
        {
            path: 'math.viking',
            content: `
                function add(a: number, b: number) -> number {
                    return a + b;
                }
                
                function multiply(a: number, b: number) -> number {
                    return a * b;
                }
            `
        },
        {
            path: 'main.viking',
            content: `
                let x = add(5, 3);
                let y = multiply(x, 2);
                print("Final result: " + y);
            `
        }
    ];
    
    const multiFileResult = compile(files, compileOptions);
    
    if (multiFileResult.errors && multiFileResult.errors.length > 0) {
        console.log('❌ Multi-file compilation failed:');
        multiFileResult.errors.forEach(error => {
            console.log(`  ${error.type}: ${error.message}`);
        });
    } else {
        console.log('✅ Multi-file compilation successful');
        
        // 保存编译结果
        const outputFile = path.join(OUTPUT_DIR, 'multi-file.js');
        fs.writeFileSync(outputFile, multiFileResult.code);
        console.log(`  Output saved to: ${outputFile}`);
    }
    console.log();
    
    // 测试 6: 不同编译选项
    console.log('🔧 Test 6: Different Compile Options');
    
    const testCode = 'let x = 42; print(x);';
    
    // 测试不同的目标版本
    const targets: Array<'es5' | 'es2015' | 'es2017' | 'es2020'> = ['es5', 'es2015', 'es2017', 'es2020'];
    
    for (const target of targets) {
        const targetResult = compileString(testCode, 'test.viking', {
            target,
            minify: false,
            optimize: false
        });
        
        if (targetResult.errors && targetResult.errors.length > 0) {
            console.log(`❌ ${target} compilation failed`);
        } else {
            console.log(`✅ ${target} compilation successful`);
            const outputFile = path.join(OUTPUT_DIR, `test-${target}.js`);
            fs.writeFileSync(outputFile, targetResult.code);
        }
    }
    
    // 测试压缩选项
    const minifiedResult = compileString(testCode, 'test.viking', {
        minify: true,
        optimize: true
    });
    
    if (minifiedResult.errors && minifiedResult.errors.length > 0) {
        console.log('❌ Minified compilation failed');
    } else {
        console.log('✅ Minified compilation successful');
        const outputFile = path.join(OUTPUT_DIR, 'test-minified.js');
        fs.writeFileSync(outputFile, minifiedResult.code);
    }
    
    console.log();
    console.log('🎉 All tests completed!');
}

// 运行测试
if (require.main === module) {
    runTests().catch(error => {
        console.error('❌ Test execution failed:', error);
        process.exit(1);
    });
}

export { runTests };