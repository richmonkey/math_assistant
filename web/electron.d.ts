export interface NotesAPI {
    createNote: (content: string) => Promise<string>;
    openNote: (id: string) => Promise<bool>;
}

declare global {
    interface Window {
        notesAPI?: NotesAPI;
    }
}

export { };
