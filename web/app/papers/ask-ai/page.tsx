"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "primereact/button";
import { InputTextarea } from "primereact/inputtextarea";
import { ProgressSpinner } from "primereact/progressspinner";
import AutoLatex from "../../components/AutoLatex";
import { type Question, usePapers } from "../../papers-context";
import {
    chatWithAgent,
    createAgentSession,
    getAgentHistory,
    type AgentHistoryMessage,
} from "../../lib/agent-api";
import { useToast } from "../../toast-context";

type Message = {
    role: "user" | "assistant";
    content: string;
};

const questionTypeLabels: Record<string, string> = {
    single: "单选题",
    multiple: "多选题",
    blank: "填空题",
    judge: "判断题",
    free: "解答题",
};

function mapAgentMessages(messages: AgentHistoryMessage[]): Message[] {
    return messages.map((message) => ({
        role: message.role === "user" ? "user" : "assistant",
        content: message.content,
    }));
}

function AskAiConversation({
    paperId,
    question,
}: {
    paperId: string;
    question: Question;
}) {
    const { updateQuestionSessionId } = usePapers();
    const { showError } = useToast();
    const [sessionId, setSessionId] = useState(question.sessionId ?? "");
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isInitializing, setIsInitializing] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const listRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        let cancelled = false;

        const initializeConversation = async () => {
            try {
                if (sessionId && messages.length > 0) {
                    return;
                }

                if (question.sessionId) {
                    const history = await getAgentHistory(question.sessionId);
                    if (cancelled) {
                        return;
                    }

                    setSessionId(history.session_id);
                    setMessages(
                        history.messages.length > 0
                            ? mapAgentMessages(history.messages)
                            : [{ role: "assistant", content: "你好，我们继续来做这道题。" }]
                    );
                    requestAnimationFrame(scrollToBottom);
                    return;
                }

                const createdSession = await createAgentSession({
                    paperId,
                    questionId: question.id,
                });

                if (cancelled) {
                    return;
                }

                setSessionId(createdSession.session_id);
                updateQuestionSessionId(paperId, question.id, createdSession.session_id);
                setMessages([
                    {
                        role: "assistant",
                        content: createdSession.reply || "你好，我们开始一起解这道题。",
                    },
                ]);
                requestAnimationFrame(scrollToBottom);
            } catch (error) {
                console.error("Failed to initialize agent session:", error);
                showError(
                    error instanceof Error ? error.message : "问答初始化失败，请稍后重试。",
                    "错误"
                );
            } finally {
                if (!cancelled) {
                    setIsInitializing(false);
                }
            }
        };

        void initializeConversation();

        return () => {
            cancelled = true;
        };
    }, [messages.length, paperId, question.id, question.sessionId, sessionId, showError, updateQuestionSessionId]);

    const handleSend = async () => {
        const questionText = input.trim();
        if (!questionText || !sessionId || isSending || isInitializing) {
            return;
        }

        const nextMessages: Message[] = [
            ...messages,
            { role: "user", content: questionText },
        ];

        setMessages(nextMessages);
        setInput("");
        setIsSending(true);

        requestAnimationFrame(scrollToBottom);

        try {
            const response = await chatWithAgent({
                sessionId,
                questionId: question.id,
                message: questionText,
            });

            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: response.reply || "我暂时没有生成有效回复，你可以换个说法再问一次。",
                },
            ]);

            requestAnimationFrame(scrollToBottom);
        } catch (error) {
            console.error("Failed to chat with AI:", error);
            showError(
                error instanceof Error ? error.message : "问答失败，请稍后重试。",
                "错误"
            );
            setMessages(messages);
            setInput(questionText);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <section className="rounded border border-[var(--surface-border)] bg-[var(--surface)] p-4">
            <div ref={listRef} className="mb-4 h-[50vh] space-y-3 overflow-y-auto pr-1">
                {isInitializing ? (
                    <div className="rounded border border-[var(--surface-border)] p-4 text-sm">
                        <div className="flex items-center gap-2">
                            <ProgressSpinner style={{ width: "20px", height: "20px" }} strokeWidth="6" />
                            <span className="text-[var(--muted)]">正在连接解题助手...</span>
                        </div>
                    </div>
                ) : (
                    messages.map((msg, index) => (
                        <div
                            key={`${msg.role}-${index}`}
                            className={`rounded p-3 text-sm ${msg.role === "user"
                                ? "ml-8 bg-[var(--hover)]"
                                : "mr-8 border border-[var(--surface-border)]"
                                }`}
                        >
                            <p className="mb-1 text-xs text-[var(--muted)]">
                                {msg.role === "user" ? "我" : "AI"}
                            </p>
                            <AutoLatex text={msg.content} />
                        </div>
                    ))
                )}
                {isSending && (
                    <div className="mr-8 rounded border border-[var(--surface-border)] p-3 text-sm">
                        <p className="mb-2 text-xs text-[var(--muted)]">AI</p>
                        <div className="flex items-center gap-2">
                            <ProgressSpinner style={{ width: "20px", height: "20px" }} strokeWidth="6" />
                            <span className="text-[var(--muted)]">正在思考...</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex gap-2">
                <InputTextarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder={sessionId ? "输入你的问题，例如：这题第一步怎么做？" : "正在初始化会话，请稍候..."}
                    rows={3}
                    className="w-full"
                    disabled={isInitializing || !sessionId}
                    onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            void handleSend();
                        }
                    }}
                />
                <Button
                    label={isSending ? "发送中" : "发送"}
                    icon="pi pi-send"
                    onClick={() => {
                        void handleSend();
                    }}
                    disabled={isInitializing || isSending || !sessionId || !input.trim()}
                />
            </div>
        </section>
    );
}

function AskAiPageContent() {
    const searchParams = useSearchParams();
    const paperId = searchParams.get("paperId") ?? "";
    const questionId = searchParams.get("questionId") ?? "";

    const { getPaperById } = usePapers();
    const router = useRouter();

    const paper = useMemo(() => getPaperById(paperId), [getPaperById, paperId]);
    const question = useMemo(
        () => paper?.questions.find((q) => q.id === questionId),
        [paper, questionId]
    );

    if (!question) {
        return (
            <main className="mx-auto max-w-3xl p-6">
                <div className="mb-6 flex items-center gap-3">
                    <Button
                        icon="pi pi-arrow-left"
                        text
                        onClick={() => router.back()}
                        aria-label="返回"
                    />
                    <h1 className="text-xl font-semibold">问 AI</h1>
                </div>
                <section className="rounded border border-[var(--surface-border)] bg-[var(--surface)] p-4">
                    <p className="text-[var(--muted)]">未找到该题目，请返回后重试。</p>
                </section>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-3xl p-6">
            <div className="mb-6 flex items-center gap-3">
                <Button
                    icon="pi pi-arrow-left"
                    text
                    onClick={() => router.back()}
                    aria-label="返回"
                />
                <h1 className="text-xl font-semibold">问 AI</h1>
            </div>

            <section className="mb-4 rounded border border-[var(--surface-border)] bg-[var(--surface)] p-4">
                <p className="mb-2 text-sm text-[var(--muted)]">
                    题型：{questionTypeLabels[question.type]}
                </p>
                <AutoLatex className="font-medium" text={question.prompt} />
            </section>

            <AskAiConversation key={`${paperId}:${question.id}`} paperId={paperId} question={question} />
        </main>
    );
}

export default function AskAiPage() {
    return (
        <Suspense fallback={<main className="mx-auto max-w-3xl p-6" />}>
            <AskAiPageContent />
        </Suspense>
    );
}
