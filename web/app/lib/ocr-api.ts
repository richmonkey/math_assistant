import { API_BASE_URL, getStoredAccessToken, handleUnauthorizedResponse } from "./auth";
import {
    isTxtFile,
    parseQuestionsFromPayload,
    parseQuestionsFromTxtFile,
} from "./txt-import";

export type PaperQuestion = {
    number: string;
    type: "multiple_choice" | "fill_blank" | "calculation" | "proof" | "judge" | "unknown";
    content: string;
    options: { label: string; text: string }[];
};

type PaperOcrApiResponse = {
    raw_text: string;
    payload: unknown;
};

type AnswerOcrApiResponse = {
    text: string;
};

async function requestOcrApi<T>(path: string, image: File): Promise<T> {
    const accessToken = getStoredAccessToken();
    if (!accessToken) {
        throw new Error("Missing access token");
    }

    const formData = new FormData();
    formData.append("image", image);

    const response = await fetch(`${API_BASE_URL}${path}`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
    });

    if (!response.ok) {
        if (response.status === 401) {
            handleUnauthorizedResponse();
            throw new Error("认证失败，请重新登录");
        }

        let detail = "Request failed";
        try {
            const err = (await response.json()) as { detail?: string };
            if (typeof err.detail === "string" && err.detail) {
                detail = err.detail;
            }
        } catch {
            // Ignore parse failures and keep fallback detail.
        }
        throw new Error(detail);
    }

    return (await response.json()) as T;
}

export async function load_paper_image(img: File): Promise<PaperQuestion[]> {
    if (isTxtFile(img)) {
        return parseQuestionsFromTxtFile(img);
    }

    const result = await requestOcrApi<PaperOcrApiResponse>("/ocr/paper", img);
    return parseQuestionsFromPayload(result.payload);
}

export async function performQuestionOcr(file: File): Promise<PaperQuestion> {
    const result = await requestOcrApi<PaperOcrApiResponse>("/ocr/paper", file);
    const questions = parseQuestionsFromPayload(result.payload);
    const first = questions[0];
    if (!first) {
        throw new Error("OCR output is missing required fields");
    }
    return first;
}

export async function performAnswerOcr(file: File): Promise<string> {
    const result = await requestOcrApi<AnswerOcrApiResponse>("/ocr/answer", file);
    return result.text?.trim() ?? "";
}
