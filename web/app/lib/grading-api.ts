import { API_BASE_URL, getStoredAccessToken } from "./auth";

export type QuestionGradingResult = {
    questionId: string;
    score: number;
    maxScore: number;
    comment: string;
    isCorrect: boolean;
};

export type QuestionData = {
    id: string;
    type: string;
    prompt: string;
    answer: string;
};

type GradeQuestionApiRequest = {
    question: QuestionData;
    maxScore: number;
};

type OverallCommentApiRequest = {
    questionResults: QuestionGradingResult[];
    totalScore: number;
    maxTotalScore: number;
};

type OverallCommentApiResponse = {
    comment: string;
};

async function requestGradingApi<T>(path: string, init?: RequestInit): Promise<T> {
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

export async function gradeQuestion(
    question: QuestionData,
    maxScore: number = 10
): Promise<QuestionGradingResult> {
    try {
        const payload: GradeQuestionApiRequest = { question, maxScore };
        const result = await requestGradingApi<QuestionGradingResult>("/grading/question", {
            method: "POST",
            body: JSON.stringify(payload),
        });

        return {
            questionId: question.id,
            score: Math.min(Math.max(result.score ?? 0, 0), maxScore),
            maxScore,
            comment: result.comment ?? "批改完成",
            isCorrect: result.isCorrect ?? false,
        };
    } catch (error) {
        console.error("Error grading question:", error);
        return {
            questionId: question.id,
            score: 0,
            maxScore,
            comment: "批改过程中出现错误，请稍后重试。",
            isCorrect: false,
        };
    }
}

export async function generateOverallComment(
    questionResults: QuestionGradingResult[],
    totalScore: number,
    maxTotalScore: number
): Promise<string> {
    try {
        const payload: OverallCommentApiRequest = {
            questionResults,
            totalScore,
            maxTotalScore,
        };
        const result = await requestGradingApi<OverallCommentApiResponse>(
            "/grading/overall-comment",
            {
                method: "POST",
                body: JSON.stringify(payload),
            }
        );
        return result.comment?.trim() ?? "评语生成失败，请稍后重试。";
    } catch (error) {
        console.error("Error generating overall comment:", error);
        return "评语生成过程中出现错误，请稍后重试。";
    }
}
