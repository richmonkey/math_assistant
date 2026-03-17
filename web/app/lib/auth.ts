export const API_BASE_URL =
    process.env.NEXT_PUBLIC_MATH_ASSISTANT_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "/v1";
// "http://127.0.0.1:8000";

export const AUTH_STORAGE_KEY = "math_assistant_auth";

type StoredAuth = {
    access_token: string;
    token_type?: string;
    expires_at?: string;
    expires_in?: number;
};

function decodeJwtPayload(token: string): { exp?: number } | null {
    const parts = token.split(".");
    if (parts.length < 2) {
        return null;
    }

    try {
        const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
        const decoded = atob(padded);
        return JSON.parse(decoded) as { exp?: number };
    } catch {
        return null;
    }
}

function getStoredAuth(): StoredAuth | null {
    if (typeof window === "undefined") {
        return null;
    }

    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
        return null;
    }

    try {
        const parsed = JSON.parse(raw) as StoredAuth;
        if (!parsed.access_token) {
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}

export function getStoredAccessToken(): string | null {
    const candidateKeys = [
        "access_token",
        "token",
        "auth_token",
        AUTH_STORAGE_KEY,
        "auth",
    ];

    for (const key of candidateKeys) {
        const rawValue = window.localStorage.getItem(key);
        if (!rawValue) {
            continue;
        }

        if (rawValue.includes(".")) {
            return rawValue;
        }

        try {
            const parsed = JSON.parse(rawValue) as {
                access_token?: string;
                token?: string;
            };
            if (parsed.access_token) {
                return parsed.access_token;
            }
            if (parsed.token) {
                return parsed.token;
            }
        } catch {
            // Ignore parse failures and try the next key.
        }
    }

    return null;
}

export function getTokenExpiryMs(token: string): number | null {
    const payload = decodeJwtPayload(token);
    if (payload?.exp) {
        return payload.exp * 1000;
    }

    const stored = getStoredAuth();
    if (!stored?.expires_at) {
        return null;
    }

    const parsed = Date.parse(stored.expires_at);
    return Number.isNaN(parsed) ? null : parsed;
}

export function isTokenExpired(token: string): boolean {
    const expiryMs = getTokenExpiryMs(token);
    if (!expiryMs) {
        return false;
    }

    return Date.now() >= expiryMs;
}

export function hasValidSession(): boolean {
    if (typeof window === "undefined") {
        return false;
    }

    const token = getStoredAccessToken();
    if (!token) {
        return false;
    }

    return !isTokenExpired(token);
}

export function clearAuthSession() {
    if (typeof window === "undefined") {
        return;
    }

    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    window.localStorage.removeItem("access_token");
    window.localStorage.removeItem("token");
    window.localStorage.removeItem("auth_token");
    window.localStorage.removeItem("auth");
}

export function saveAuthSession(payload: {
    access_token: string;
    token_type: string;
    expires_at?: string;
    expires_in?: number;
}) {
    if (typeof window === "undefined") {
        return;
    }

    const session: StoredAuth = {
        access_token: payload.access_token,
        token_type: payload.token_type,
        expires_at: payload.expires_at,
        expires_in: payload.expires_in,
    };

    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    window.localStorage.setItem("access_token", payload.access_token);
}
