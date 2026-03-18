import { API_BASE_URL, getStoredAccessToken } from "./auth";

type AgentHistoryMessage = {
    role: "user" | "ai";
    content: string;
};

type AgentSessionResponse = {
    session_id: string;
    message: string;
    reply: string;
};

type AgentChatResponse = {
    session_id: string;
    reply: string;
};

type AgentHistoryResponse = {
    session_id: string;
    messages: AgentHistoryMessage[];
};

async function requestAgentApi<T>(path: string, init?: RequestInit): Promise<T> {
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

export function createAgentSession(payload: { paperId: string; questionId: string }) {
    return requestAgentApi<AgentSessionResponse>("/agent/session", {
        method: "POST",
        body: JSON.stringify({
            paper_id: payload.paperId,
            question_id: payload.questionId,
        }),
    });
}

export function chatWithAgent(payload: {
    sessionId: string;
    questionId: string;
    message: string;
}) {
    return requestAgentApi<AgentChatResponse>("/agent/chat", {
        method: "POST",
        body: JSON.stringify({
            session_id: payload.sessionId,
            question_id: payload.questionId,
            message: payload.message,
        }),
    });
}

export function getAgentHistory(sessionId: string) {
    return requestAgentApi<AgentHistoryResponse>(
        `/agent/history/${encodeURIComponent(sessionId)}`,
        { method: "GET" }
    );
}

export type { AgentHistoryMessage, AgentHistoryResponse, AgentChatResponse, AgentSessionResponse };