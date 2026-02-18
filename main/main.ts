import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'node:path';
import { createNote, openNote } from './note';

function createWindow() {
    const win = new BrowserWindow({
        width: 600,
        height: 400,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false, // 安全建议：禁用 Node 集成
            contextIsolation: true  // 安全建议：开启上下文隔离
        }
    });

    win.loadFile('index.html');
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
    return openNote(noteId);
});

