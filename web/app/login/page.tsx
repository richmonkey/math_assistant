"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { login } from "../lib/auth-api";
import { saveAuthSession } from "../lib/auth";

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState("admin");
    const [password, setPassword] = useState("123456");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");

        const trimmedUsername = username.trim();
        const trimmedPassword = password.trim();
        if (!trimmedUsername || !trimmedPassword) {
            setError("请输入用户名和密码");
            return;
        }

        setSubmitting(true);
        try {
            const result = await login({
                username: trimmedUsername,
                password: trimmedPassword,
            });

            saveAuthSession(result);
            router.replace("/");
        } catch (err) {
            setError(err instanceof Error ? err.message : "登录失败");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center p-6">
            <section className="w-full rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-6 shadow-sm">
                <h1 className="mb-1 text-2xl font-semibold">登录 Math Assistant</h1>
                <p className="mb-6 text-sm text-[var(--muted)]">
                    登录后即可管理试卷、题目与批改结果。
                </p>

                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium" htmlFor="username">
                            用户名
                        </label>
                        <InputText
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            autoComplete="username"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium" htmlFor="password">
                            密码
                        </label>
                        <Password
                            inputId="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            feedback={false}
                            toggleMask
                            autoComplete="current-password"
                        />
                    </div>

                    {error ? <p className="text-sm text-red-500">{error}</p> : null}

                    <Button
                        type="submit"
                        label={submitting ? "登录中..." : "登录"}
                        className="w-full"
                        disabled={submitting}
                    />
                </form>
            </section>
        </main>
    );
}
