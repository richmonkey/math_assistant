import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'node:path';
import { createNote, openNote } from './note';
import { getConfigFileName, loadConfig } from "./config";

const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
    const win = new BrowserWindow({
        width: 1024,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.bundle.js'),
            nodeIntegration: false, // 安全建议：禁用 Node 集成
            contextIsolation: true  // 安全建议：开启上下文隔离
        }
    });

    if (isDev) {
        // 【开发环境】加载 localhost:3000
        // 这样你在修改 Next.js 页面代码时，Electron 窗口内会自动热更新
        win.loadURL('http://localhost:3000');

        // 开发模式下自动打开调试工具
        win.webContents.openDevTools();
    } else {
        win.loadFile('index.html');
    }
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('create-note', async (event, content) => {
    return createNote(content);
});


ipcMain.handle('open-note', async (event, noteId) => {
    try {
        let r = await openNote(noteId);
        return r == "success";
    } catch (e) {
        return false;
    }
});

ipcMain.handle("load-config", async (event) => {
    const userDataPath = app.getPath('userData');
    const filename = getConfigFileName(userDataPath);
    const config = await loadConfig(filename);
    return config;
});