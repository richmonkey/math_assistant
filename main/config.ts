import * as fs from "node:fs/promises";
import * as path from "node:path";

export function getConfigFileName(userDataPath: string) {
    var filename = path.join(userDataPath, "config.json");
    return filename;
}

export async function loadConfig(filename: string) {
    try {
        let res = await fs.readFile(filename, { encoding: 'utf8' });
        let obj = JSON.parse(res);
        console.log("config obj:", obj);
        return obj;
    } catch (e) {
        console.log("read config file err:", e);
        return {};
    }
}
