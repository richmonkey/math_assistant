"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearAuthSession, hasValidSession } from "../lib/auth";

export default function AuthGate({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const isLoginPage = pathname === "/login";
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        setIsHydrated(true);
    }, []);

    // Re-evaluate session status on each render after hydration so route guards
    // react immediately to in-tab login/logout updates.
    const hasSession = isHydrated && hasValidSession();

    const shouldRedirectToLogin = isHydrated && !hasSession && !isLoginPage;
    const shouldRedirectToHome = isHydrated && hasSession && isLoginPage;

    useEffect(() => {
        if (!isHydrated) {
            return;
        }

        if (shouldRedirectToLogin) {
            clearAuthSession();
            router.replace("/login");
            return;
        }

        if (shouldRedirectToHome) {
            router.replace("/");
        }
    }, [isHydrated, router, shouldRedirectToHome, shouldRedirectToLogin]);

    if (!isHydrated || shouldRedirectToLogin || shouldRedirectToHome) {
        return (
            <main className="mx-auto flex min-h-screen max-w-xl items-center justify-center p-6 text-sm text-[var(--muted)]">
                正在检查登录状态...
            </main>
        );
    }

    return <>{children}</>;
}
