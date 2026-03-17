import { API_BASE_URL } from "./auth";

export type LoginResponse = {
    access_token: string;
    token_type: string;
    expires_at?: string;
    expires_in?: number;
};

export async function login(payload: { username: string; password: string }) {
    const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        let detail = "登录失败，请检查用户名和密码";
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

    return (await response.json()) as LoginResponse;
}
