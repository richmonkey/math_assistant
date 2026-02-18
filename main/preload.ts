import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('notesAPI', {
    // 发送创建请求
    createNote: (content: string) => ipcRenderer.invoke('create-note', content),

    // 发送打开请求
    openNote: (id: string) => ipcRenderer.invoke('open-note', id)
});