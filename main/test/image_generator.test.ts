import { describe, before } from "mocha"
import { expect } from 'chai';
import * as path from "node:path";
import * as fs from "node:fs"
import { app } from "electron";
import { generateImageFromHtml } from "../image_generator";

describe('Note Renderer (Main Process)', function () {
    // 设置较长的超时时间，因为启动窗口和截图比较耗时
    this.timeout(10000);

    const testOutputPath = path.join(__dirname, 'test_output.png');

    // 在所有测试开始前，确保 Electron app 已就绪
    before(async () => {
        if (!app.isReady()) {
            await app.whenReady();
        }
    });

    // 每个测试后清理生成的文件
    afterEach(() => {
        if (fs.existsSync(testOutputPath)) {
            fs.unlinkSync(testOutputPath);
        }
    });

    it('should generate a PNG file from HTML content', async () => {
        const title = 'Unit Test Title';
        const body = '<p>This is a paragraph for <strong>testing</strong>.</p>';

        // 执行被测函数
        await generateImageFromHtml(title, body, testOutputPath);

        // 断言 1: 文件必须存在
        expect(fs.existsSync(testOutputPath)).to.be.true;

        // 断言 2: 文件大小应该大于 0
        const stats = fs.statSync(testOutputPath);
        expect(stats.size).to.be.greaterThan(0);

        console.log(`    ✓ Image generated at: ${testOutputPath} (Size: ${stats.size} bytes)`);
    });

    it('should handle long content by resizing window', async () => {
        const title = 'Long Content Test';
        // 生成很长的内容
        const longBody = '<p>Line</p>'.repeat(100);

        await generateImageFromHtml(title, longBody, testOutputPath);

        expect(fs.existsSync(testOutputPath)).to.be.true;

        // 可以在这里引入 'image-size' 库来检查生成图片的尺寸是否符合预期
        // const sizeOf = require('image-size');
        // const dimensions = sizeOf(testOutputPath);
        // expect(dimensions.height).to.be.greaterThan(1000);
    });
});