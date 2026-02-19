import { Ollama } from "ollama/browser";

let ollama: Ollama = new Ollama();

export function initOllama(config: { ollamaHost?: string }) {
    if (config.ollamaHost) {
        ollama = new Ollama({ host: config.ollamaHost });
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
