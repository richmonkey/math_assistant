import { Ollama } from "ollama/browser";

let ollama: Ollama = new Ollama();

export function initOllama(config: { host?: string }) {
    if (config.host) {
        ollama = new Ollama({ host: config.host });
    } else {
        ollama = new Ollama();
    }
}

export function getOllama() {
    if (!ollama) {
        throw new Error("Ollama is not initialized. Please call initOllama first.");
    }
    return ollama;
}

export async function chatCompletions(prompt: string, image?: File) {
    const ollama = getOllama();
    let images = undefined;
    if (image) {
        const arrayBuffer = await image.arrayBuffer();
        const encodedImage = await ollama.encodeImage(new Uint8Array(arrayBuffer));
        images = [encodedImage];
    }

    const response = await ollama.chat({
        model: "qwen3-vl:8b-instruct",
        messages: [
            {
                role: "user",
                content: prompt,
                images: images,
            },
        ],
    });

    return response.message.content?.trim() ?? "";
}