import { describe, before } from "mocha"
import { expect } from 'chai';
import { exportNoteImage, createNote } from "../note";
import * as path from "node:path";
import * as os from "os";

describe("Note", function () {
    it("create note", async function () {
        const noteId = await createNote("Hello from Electron!");
        console.log(`Created note with ID: ${noteId}`);

        //let noteId = "x-coredata://86F871C2-48AB-475E-9B6A-07FC8E4AC94B/ICNote/p60";
        // try {
        //     const result = await openNote(noteId);
        //     console.log(`openNote result: ${result}`);
        // } catch (error) {
        //     console.error(`openNote failed: ${error}`);
        // }

        // 2. 生成图片路径
        //const savePath = path.join(os.homedir(), 'Desktop', `Note_${Date.now()}.png`);

        //await exportNoteImage(noteId, savePath);
    });
});
