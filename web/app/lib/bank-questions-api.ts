import { API_BASE_URL, getStoredAccessToken, handleUnauthorizedResponse } from "./auth";

export type BankQuestionResponse = {
    id: string;
    type: "single" | "multiple" | "blank" | "judge" | "free";
    prompt: string;
    answer: string;
    standard_answer_image_url?: string | null;
    reference_image_url?: string | null;
    content_image_url?: string | null;
    external_url?: string | null;
    has_image: boolean;
    is_published: boolean;
};

async function requestApi<T>(path: string, init?: RequestInit): Promise<T> {
    const accessToken = getStoredAccessToken();
    if (!accessToken) {
        throw new Error("Missing access token");
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            ...(init?.headers ?? {}),
        },
    });

    if (!response.ok) {
        if (response.status === 401) {
            handleUnauthorizedResponse();
            throw new Error("认证失败，请重新登录");
        }

        let detail = "Request failed";
        try {
            const err = (await response.json()) as { detail?: string };
            if (err.detail) {
                detail = err.detail;
            }
        } catch {
            // Ignore parse failures and keep fallback detail.
        }
        throw new Error(detail);
    }

    return (await response.json()) as T;
}

export function listUnpublishedBankQuestions(): Promise<BankQuestionResponse[]> {
    return requestApi<BankQuestionResponse[]>("/bank-questions?is_published=false");
}

export function listBankQuestions(isPublished: boolean): Promise<BankQuestionResponse[]> {
    return requestApi<BankQuestionResponse[]>(`/bank-questions?is_published=${isPublished}`);
}

export function updateBankQuestion(
    questionId: string,
    payload: { prompt: string; answer: string; type?: string | null; reference_image_url?: string | null }
): Promise<BankQuestionResponse> {
    return requestApi<BankQuestionResponse>(
        `/bank-questions/${encodeURIComponent(questionId)}`,
        {
            method: "PUT",
            body: JSON.stringify(payload),
        }
    );
}

export function publishBankQuestion(questionId: string): Promise<BankQuestionResponse> {
    return requestApi<BankQuestionResponse>(
        `/bank-questions/${encodeURIComponent(questionId)}/publish`,
        { method: "PUT" }
    );
}
