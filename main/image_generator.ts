import { BrowserWindow } from 'electron';
import * as fs from 'node:fs';

/**
 * 辅助函数：创建一个隐藏窗口，渲染 HTML 并截图
 */
export async function generateImageFromHtml(title: string, bodyHtml: string, outputPath: string) {
    // 创建一个隐藏的窗口
    let workerWin = new BrowserWindow({
        show: false, // 关键：不显示
        width: 800,  // 设置宽度（决定图片宽度）
        height: 600, // 初始高度，后面会自动调整
        webPreferences: {
            offscreen: true, // 启用离屏渲染
            javascript: true
        }
    });

    // 构建完整的 HTML 页面，模拟 Apple Notes 的样式
    const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          padding: 40px;
          background-color: #ffffff;
          color: #333;
          margin: 0;
        }
        h1.note-title {
          font-size: 28px;
          border-bottom: 1px solid #eee;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }
        /* 备忘录内容的样式修复 */
        div { font-size: 16px; line-height: 1.6; }
        img { max-width: 100%; height: auto; }
      </style>
    </head>
    <body>
      <h1 class="note-title">${title}</h1>
      <div id="content">${bodyHtml}</div>
    </body>
    </html>
  `;

    // 加载 HTML 数据
    await workerWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(fullHtml));

    // 等待内容加载完成
    // 计算内容高度
    const contentHeight = await workerWin.webContents.executeJavaScript(`
    document.body.scrollHeight
  `);

    // 调整窗口高度以适应内容（加一点 padding 防止截断）
    workerWin.setSize(800, contentHeight + 20);

    // 短暂延时，确保渲染和重排完成
    await new Promise(r => setTimeout(r, 200));

    // 截图
    const image = await workerWin.webContents.capturePage();

    // 保存文件
    fs.writeFileSync(outputPath, image.toPNG());

    // 清理窗口
    workerWin.close();
    workerWin = null;
}