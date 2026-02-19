import { getOpenAI, chatCompletions as openAIChatCompletions } from "./openai";
import { getOllama, chatCompletions as ollamaChatCompletions } from "./ollama";

export async function chatCompletions(prompt: string, image?: File) {
    try {
        getOpenAI();
        return openAIChatCompletions(prompt, image);
    } catch (err) {
        getOllama();
        return ollamaChatCompletions(prompt, image);
    }
}