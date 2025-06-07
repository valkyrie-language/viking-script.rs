/**
 * Viking Script Compiler Test
 * 测试编译器的基本功能
 */

const fs = require('fs');
const path = require('path');

// 由于我们使用 TypeScript，需要先编译或使用 ts-node
// 这里我们假设已经编译到 dist 目录
try {
    // 尝试导入编译后的模块
    const { compile, tokenize, parseSource } = require('./dist/index.js');

    console.log('=== Viking Script Compiler Test ===\n');

    // 测试简单的 Viking 代码
    const simpleCode = `
let x = 1;
let mut y = 2;
y = y + x;
print(y);
`;

    console.log('1. Testing simple variable operations:');
    console.log('Source code:');
    console.log(simpleCode);
    console.log();

    // 测试词法分析
    console.log('2. Tokenization:');
    try {
        const tokens = tokenize(simpleCode, 'test.vks');
        console.log('Tokens generated:', tokens.length);
        console.log('First few tokens:');
        tokens.slice(0, 10).forEach((token, i) => {
            console.log(`  ${i}: ${token.type} = "${token.value}"`);
        });
    } catch (error) {
        console.error('Tokenization failed:', error.message);
    }
    console.log();

    // 测试语法分析
    console.log('3. Parsing:');
    try {
        const ast = parseSource(simpleCode, 'test.vks');
        console.log('AST generated successfully');
        console.log('Program body length:', ast.body.length);
        console.log('First statement type:', ast.body[0]?.type);
    } catch (error) {
        console.error('Parsing failed:', error.message);
        if (error.location) {
            console.error(`  at line ${error.location.start.line}, column ${error.location.start.column}`);
        }
    }
    console.log();

    // 测试完整编译
    console.log('4. Full compilation:');
    try {
        const result = compile(simpleCode, {
            filename: 'test.vks',
            sourceMap: true,
            emitTokens: false,
            emitAST: false,
            emitCPS: false
        });

        if (result.success) {
            console.log('✅ Compilation successful!');
            console.log('Generated JavaScript:');
            console.log('---');
            console.log(result.code);
            console.log('---');

            if (result.sourceMap) {
                console.log('Source map generated: Yes');
            }

            if (result.warnings.length > 0) {
                console.log('Warnings:');
                result.warnings.forEach(warning => {
                    console.log(`  - ${warning.message}`);
                });
            }
        } else {
            console.log('❌ Compilation failed!');
            console.log('Errors:');
            result.errors.forEach(error => {
                console.log(`  - ${error.message}`);
                if (error.location) {
                    console.log(`    at line ${error.location.start.line}, column ${error.location.start.column}`);
                }
            });
        }
    } catch (error) {
        console.error('Compilation crashed:', error.message);
        console.error(error.stack);
    }
    console.log();

    // 测试示例文件
    const examplePath = path.join(__dirname, 'examples', 'basic.vks');
    if (fs.existsSync(examplePath)) {
        console.log('5. Testing example file:');
        try {
            const exampleCode = fs.readFileSync(examplePath, 'utf8');
            console.log(`Reading ${examplePath}...`);

            const result = compile(exampleCode, {
                filename: 'basic.vks',
                sourceMap: true
            });

            if (result.success) {
                console.log('✅ Example compilation successful!');
                console.log(`Generated ${result.code.length} characters of JavaScript`);

                // 保存生成的代码
                const outputPath = path.join(__dirname, 'examples', 'basic.js');
                fs.writeFileSync(outputPath, result.code);
                console.log(`Saved to ${outputPath}`);

                if (result.sourceMap) {
                    const mapPath = path.join(__dirname, 'examples', 'basic.js.map');
                    fs.writeFileSync(mapPath, JSON.stringify(result.sourceMap));
                    console.log(`Source map saved to ${mapPath}`);
                }
            } else {
                console.log('❌ Example compilation failed!');
                result.errors.forEach(error => {
                    console.log(`  - ${error.message}`);
                });
            }
        } catch (error) {
            console.error('Example test failed:', error.message);
        }
    } else {
        console.log('5. Example file not found, skipping...');
    }

    console.log('\n=== Test completed ===');

} catch (error) {
    console.error('Failed to load compiler modules:');
    console.error('Make sure to run "npm run build" first to compile TypeScript files.');
    console.error('Error:', error.message);

    // 提供构建指令
    console.log('\nTo build the project:');
    console.log('  npm install');
    console.log('  npm run build');
    console.log('  node test.js');
}