"use client";

import { useCallback, useEffect, useState } from "react";
import { ProgressSpinner } from "primereact/progressspinner";
import { initOllama } from "../lib/ollama";
import { initOpenAI } from "../lib/openai";
import type { Config } from "../../electron";

type InitStatus = "loading" | "success" | "error";

type OllamaInitializerProps = {
    children: React.ReactNode;
};

export default function OllamaInitializer({ children }: OllamaInitializerProps) {
    const [status, setStatus] = useState<InitStatus>("loading");
    const [errorMessage, setErrorMessage] = useState("");

    async function initialize() {
        setStatus("loading");
        setErrorMessage("");

        try {
            let config: Config = {};
            if (window.notesAPI) {
                config = await window.notesAPI.loadConfig();
            }
            if (config.openai) {
                initOpenAI(config.openai);
            } else {
                initOllama({ host: config.ollama?.host });
                // const defaultBaseURL = "http://localhost:11434/v1";
                // const defaultModel = "qwen3-vl:8b-instruct";
                // initOpenAI(defaultBaseURL, "ollama", defaultModel);
            }
            setStatus("success");
        } catch (error) {
            console.error("Failed to initialize Ollama:", error);
            setErrorMessage("Ollama 初始化失败，请检查配置后重试。");
            setStatus("error");
        }
    }

    useEffect(() => {
        initialize();
    }, []);

    if (status === "success") {
        return <>{children}</>;
    }

    return (
        <main className="flex min-h-screen items-center justify-center p-6">
            <section className="w-full max-w-md rounded border border-[var(--surface-border)] bg-[var(--surface)] p-6 text-center">
                {status === "loading" ? (
                    <>
                        <ProgressSpinner style={{ width: "48px", height: "48px" }} strokeWidth="6" />
                        <p className="mt-4 text-sm text-[var(--muted)]">正在初始化...</p>
                    </>
                ) : (
                    <>
                        <i className="pi pi-exclamation-triangle text-2xl text-[var(--muted)]" />
                        <p className="mt-4 text-sm text-[var(--muted)]">{errorMessage}</p>
                    </>
                )}
            </section>
        </main>
    );
}