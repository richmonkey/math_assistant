export interface Config {
    ollama?: {
        host: string;
    };
    openai?: {
        apiKey: string;
        baseURL: string;
        model: string;
        vlModel?: string;
    }
}

export interface NotesAPI {
    createNote: (content: string) => Promise<string>;
    openNote: (id: string) => Promise<bool>;
    loadConfig: () => Promise<Config>;
}

declare global {
    interface Window {
        notesAPI?: NotesAPI;
    }
}

export { };
