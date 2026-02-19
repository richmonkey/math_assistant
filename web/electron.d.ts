export interface Config {
    ollamaHost?: string;
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
