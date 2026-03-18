import type { PaperQuestion } from "./ocr";

const QUESTION_TYPES = new Set<PaperQuestion["type"]>([
    "multiple_choice",
    "fill_blank",
    "calculation",
    "proof",
    "judge",
    "unknown",
]);

function toPaperQuestionType(value: unknown): PaperQuestion["type"] {
    if (typeof value === "string" && QUESTION_TYPES.has(value as PaperQuestion["type"])) {
        return value as PaperQuestion["type"];
    }
    return "unknown";
}

export function parseQuestionsFromPayload(payload: unknown): PaperQuestion[] {
    const source = Array.isArray(payload)
        ? payload
        : payload && typeof payload === "object" && Array.isArray((payload as { questions?: unknown }).questions)
            ? (payload as { questions: unknown[] }).questions
            : null;

    if (!source || source.length === 0) {
        throw new Error("Import payload does not contain questions");
    }

    return source.map((item, index) => {
        const question = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
        const rawOptions = Array.isArray(question.options) ? question.options : [];
        const options = rawOptions
            .map((option) => {
                const optionObj = option && typeof option === "object" ? (option as Record<string, unknown>) : null;
                if (!optionObj) {
                    return null;
                }
                return {
                    label: typeof optionObj.label === "string" ? optionObj.label : "",
                    text: typeof optionObj.text === "string" ? optionObj.text : "",
                };
            })
            .filter((option): option is { label: string; text: string } => option !== null);

        return {
            number: typeof question.number === "string" ? question.number : `${index + 1}`,
            type: toPaperQuestionType(question.type),
            content: typeof question.content === "string" ? question.content : "",
            options,
        };
    });
}

export function isTxtFile(file: File): boolean {
    return file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt");
}

export async function parseQuestionsFromTxtFile(file: File): Promise<PaperQuestion[]> {
    const content = await file.text();
    const payload = JSON.parse(content) as unknown;
    return parseQuestionsFromPayload(payload);
}
