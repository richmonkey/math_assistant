import { exec } from 'child_process';

import { generateImageFromHtml } from "./image_generator";

export function createNote(content: string): Promise<string> {
    return new Promise((resolve, reject) => {
        // 简单的转义，防止双引号破坏 AppleScript 语法
        const safeContent = content.replace(/"/g, '\\"');

        // AppleScript 脚本
        const script = `
    tell application "Notes"
        activate
        -- 创建新笔记，HTML 格式 body
        set newNote to make new note with properties {body: "${safeContent}"}
        -- 获取 ID (格式通常是 x-coredata://...)
        return id of newNote
    end tell`;

        exec(`osascript -e '${script}'`, (error, stdout, stderr) => {
            if (error) {
                console.error(`执行出错: ${error.message}`);
                reject(error.message);
                return;
            }
            // 去除返回结果中的换行符
            resolve(stdout.trim());
        });
    });
}

export function openNote(noteId: string, timeout: number = 5000): Promise<string> {
    return new Promise((resolve, reject) => {
        const script = `
      tell application "Notes"
        activate
        try
          show note id "${noteId}"
          return "success"
        on error errMsg
          return "not_found"
        end try
      end tell`;

        exec(`osascript -e '${script}'`, (error, stdout, stderr) => {
            if (error) {
                // 即使出错，也尝试解析输出
                console.error(`AppleScript error: ${error.message}`);
                console.error(`stderr: ${stderr}`);
                const output = stdout.trim();
                if (output) {
                    resolve(output);
                } else {
                    reject(error.message);
                }
                return;
            }
            const result = stdout.trim();
            // 确保总是返回结果
            if (result) {
                resolve(result);
            } else {
                // 即使结果为空，也应该 resolve 而不是 reject
                resolve("not_found");
            }
        });
    });
}

export function exportNoteImage(noteId: string, savePath: string): Promise<string> {
    return new Promise((resolve, reject) => {

        // 1. AppleScript 获取标题和内容
        const script = `
      tell application "Notes"
        try
          set targetNote to note id "${noteId}"
          set noteName to name of targetNote
          set noteBody to body of targetNote
          return noteName & "|||||" & noteBody
        on error
          return "error"
        end try
      end tell
    `;

        exec(`osascript -e '${script}'`, async (error, stdout, stderr) => {
            if (error || stdout.trim() === 'error') {
                reject('无法获取笔记内容，请检查 ID');
                return;
            }

            // 分割标题和内容
            const parts = stdout.split('|||||');
            const title = parts[0];
            const bodyContent = parts.slice(1).join('|||||'); // 防止内容中有分隔符

            try {
                // 2. 生成图片路径
                //const savePath = path.join(os.homedir(), 'Desktop', `Note_${Date.now()}.png`);

                // 3. 调用离屏渲染生成图片
                await generateImageFromHtml(title, bodyContent, savePath);

                resolve(savePath);
            } catch (err) {
                reject(err.message);
            }
        });
    });
}
// async function main() {
//     //const noteId = await createNote("Hello from Electron!");
//     //console.log(`Created note with ID: ${noteId}`);
//     let noteId = "x-coredata://86F871C2-48AB-475E-9B6A-07FC8E4AC94B/ICNote/p60";
//     try {
//         const result = await openNote(noteId);
//         console.log(`openNote result: ${result}`);
//     } catch (error) {
//         console.error(`openNote failed: ${error}`);
//     }
// }
// //x-coredata://86F871C2-48AB-475E-9B6A-07FC8E4AC94B/ICNote/p55
// main();