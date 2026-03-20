import { API_BASE_URL, getStoredAccessToken, handleUnauthorizedResponse } from "./auth";

export type ServerPaperResponse = {
    id: string;
    title: string;
    description?: string | null;
    updated_at: string;
};

export type ServerQuestionResponse = {
    id: string;
    paper_id: string;
    type: "single" | "multiple" | "blank" | "judge" | "free";
    prompt: string;
    answer: string;
    session_id?: string;
};

export type ServerQuestionGradingResultResponse = {
    id: string;
    question_id: string;
    comment: string;
    score: number;
    max_score: number;
    is_correct: boolean;
};

export type ServerPaperGradingResultResponse = {
    id: string;
    paper_id: string;
    comment: string;
    score: number;
    max_score: number;
};

export type ServerPaperDetailResponse = {
    id: string;
    uid: string;
    title: string;
    description?: string | null;
    updated_at: string;
    grading_result?: ServerPaperGradingResultResponse | null;
    questions: Array<
        ServerQuestionResponse & {
            grading_result?: ServerQuestionGradingResultResponse | null;
        }
    >;
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

    if (response.status === 204) {
        return undefined as T;
    }

    return (await response.json()) as T;
}

export function listPapers() {
    return requestApi<ServerPaperResponse[]>("/papers", { method: "GET" });
}

export function getPaperDetail(paperId: string) {
    return requestApi<ServerPaperDetailResponse>(
        `/papers/${encodeURIComponent(paperId)}`,
        { method: "GET" }
    );
}

export function createPaper(payload: { title: string; description?: string | null }) {
    return requestApi<ServerPaperResponse>("/papers", {
        method: "POST",
        body: JSON.stringify({
            title: payload.title,
            description: payload.description ?? null,
        }),
    });
}

export function createQuestion(payload: {
    paperId: string;
    type: "single" | "multiple" | "blank" | "judge" | "free";
    prompt: string;
    answer: string;
}) {
    return requestApi<ServerQuestionResponse>("/questions", {
        method: "POST",
        body: JSON.stringify({
            paper_id: payload.paperId,
            type: payload.type,
            prompt: payload.prompt,
            answer: payload.answer,
        }),
    });
}

export function updateQuestionApi(payload: {
    questionId: string;
    type: "single" | "multiple" | "blank" | "judge" | "free";
    prompt: string;
    answer: string;
}) {
    return requestApi<ServerQuestionResponse>(
        `/questions/${encodeURIComponent(payload.questionId)}`,
        {
            method: "PUT",
            body: JSON.stringify({
                type: payload.type,
                prompt: payload.prompt,
                answer: payload.answer,
            }),
        }
    );
}

export function deleteQuestionApi(questionId: string) {
    return requestApi<{ message: string }>(
        `/questions/${encodeURIComponent(questionId)}`,
        { method: "DELETE" }
    );
}

export function uploadQuestionGradingResult(payload: {
    questionId: string;
    comment: string;
    score: number;
    maxScore: number;
    isCorrect: boolean;
}) {
    return requestApi<ServerQuestionGradingResultResponse>(
        `/questions/${encodeURIComponent(payload.questionId)}/grading-result`,
        {
            method: "POST",
            body: JSON.stringify({
                comment: payload.comment,
                score: payload.score,
                max_score: payload.maxScore,
                is_correct: payload.isCorrect,
            }),
        }
    );
}

export function uploadPaperGradingResult(payload: {
    paperId: string;
    comment: string;
    score: number;
    maxScore: number;
}) {
    return requestApi<ServerPaperGradingResultResponse>(
        `/papers/${encodeURIComponent(payload.paperId)}/grading-result`,
        {
            method: "POST",
            body: JSON.stringify({
                comment: payload.comment,
                score: payload.score,
                max_score: payload.maxScore,
            }),
        }
    );
}
