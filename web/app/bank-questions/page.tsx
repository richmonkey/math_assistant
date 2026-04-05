"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "primereact/button";
import { ProgressSpinner } from "primereact/progressspinner";
import { BankQuestionResponse } from "../lib/bank-questions-api";
import { useBankQuestions } from "./bank-questions-context";
import { useToast } from "../toast-context";
import AutoLatex from "../components/AutoLatex";

const questionTypeLabels: Record<string, string> = {
    single: "单选题",
    multiple: "多选题",
    blank: "填空题",
    judge: "判断题",
    free: "解答题",
};

function BankQuestionItem({ question, showPublish }: { question: BankQuestionResponse; showPublish: boolean }) {
    const { getEffective, hasDraft, publishQuestion } = useBankQuestions();
    const [isPublishing, setIsPublishing] = useState(false);
    const { showError, showMessage } = useToast();
    const router = useRouter();

    const effective = getEffective(question);

    const handlePublish = async () => {
        setIsPublishing(true);
        try {
            await publishQuestion(question.id);
            showMessage({ detail: "题目已发布", severity: "success" });
        } catch (err) {
            console.error("Failed to publish question:", err);
            showError("发布失败，请检查登录状态或稍后重试", "发布失败");
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <li className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
                <span className="rounded bg-[var(--hover)] px-2 py-1 text-xs text-[var(--muted)]">
                    {questionTypeLabels[effective.type] ?? effective.type}
                </span>
                <Button
                    label="编辑"
                    icon="pi pi-pencil"
                    severity="secondary"
                    outlined
                    size="small"
                    onClick={() => router.push(`/bank-questions/edit?questionId=${encodeURIComponent(question.id)}`)}
                />
            </div>

            {question.content_image_url && (
                <div className="mb-3">
                    <a href={question.content_image_url} target="_blank" rel="noreferrer">
                        <img
                            src={question.content_image_url}
                            alt="题目图片"
                            className="max-h-48 cursor-pointer rounded border border-[var(--surface-border)] object-contain hover:opacity-80"
                        />
                    </a>
                </div>
            )}

            <div className="flex flex-col gap-2">
                <div className="text-sm">
                    <AutoLatex text={effective.prompt || "（无题目内容）"} />
                </div>
                {hasDraft(question.id) && (
                    <p className="text-xs text-amber-500">已编辑（未发布）</p>
                )}
                {effective.referenceImageUrl && (
                    <div className="mt-2">
                        <p className="mb-1 text-xs text-[var(--muted)]">参考图</p>
                        <a href={effective.referenceImageUrl} target="_blank" rel="noreferrer">
                            <img
                                src={effective.referenceImageUrl}
                                alt="参考图"
                                className="max-h-32 cursor-pointer rounded border border-[var(--surface-border)] object-contain hover:opacity-80"
                            />
                        </a>
                    </div>
                )}
                {question.standard_answer_image_url && (
                    <div className="mt-2">
                        <p className="mb-1 text-xs text-[var(--muted)]">标准答案图片</p>
                        <a href={question.standard_answer_image_url} target="_blank" rel="noreferrer">
                            <img
                                src={question.standard_answer_image_url}
                                alt="标准答案"
                                className="max-h-32 cursor-pointer rounded border border-[var(--surface-border)] object-contain hover:opacity-80"
                            />
                        </a>
                    </div>
                )}
                <div className="flex justify-end pt-1">
                    {showPublish && (
                        <Button
                            label="发布"
                            icon="pi pi-send"
                            size="small"
                            loading={isPublishing}
                            onClick={handlePublish}
                        />
                    )}
                </div>
            </div>
        </li>
    );
}

export default function BankQuestionsPage() {
    const { questions, isLoading, loadError, loadQuestions } = useBankQuestions();
    const { showError } = useToast();
    const [showPublished, setShowPublished] = useState(false);

    useEffect(() => {
        loadQuestions(showPublished).catch((err: unknown) => {
            showError(err instanceof Error ? err.message : "加载失败", "加载失败");
        });
    }, [loadQuestions, showError, showPublished]);

    return (
        <main className="mx-auto max-w-3xl p-6">
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/">
                        <Button icon="pi pi-arrow-left" text aria-label="返回首页" />
                    </Link>
                    <h1 className="text-2xl font-semibold">题库管理</h1>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex overflow-hidden rounded border border-[var(--surface-border)] text-sm">
                        <button
                            className={`px-3 py-1.5 transition-colors ${
                                !showPublished
                                    ? "bg-[var(--primary)] text-white"
                                    : "bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--hover)]"
                            }`}
                            onClick={() => setShowPublished(false)}
                        >
                            未发布
                        </button>
                        <button
                            className={`border-l border-[var(--surface-border)] px-3 py-1.5 transition-colors ${
                                showPublished
                                    ? "bg-[var(--primary)] text-white"
                                    : "bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--hover)]"
                            }`}
                            onClick={() => setShowPublished(true)}
                        >
                            已发布
                        </button>
                    </div>
                    <Button
                        icon="pi pi-refresh"
                        severity="secondary"
                        outlined
                        label="刷新"
                        onClick={() => void loadQuestions(showPublished)}
                        loading={isLoading}
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-16">
                    <ProgressSpinner />
                </div>
            ) : loadError ? (
                <div className="rounded border border-[var(--surface-border)] bg-[var(--surface)] p-8 text-center">
                    <p className="text-red-400">{loadError}</p>
                    <Button
                        label="重试"
                        icon="pi pi-refresh"
                        className="mt-4"
                        onClick={() => void loadQuestions()}
                    />
                </div>
            ) : questions.length === 0 ? (
                <div className="rounded border border-[var(--surface-border)] bg-[var(--surface)] p-8 text-center">
                    <p className="text-[var(--muted)]">暂无待发布的题目</p>
                </div>
            ) : (
                <>
                    <p className="mb-4 text-sm text-[var(--muted)]">
                        共 {questions.length} 道{showPublished ? "已发布" : "待发布"}题目{!showPublished && "，编辑后点击\u201c发布\u201d提交"}
                    </p>
                    <ul className="flex flex-col gap-4">
                        {questions.map((q) => (
                            <BankQuestionItem key={q.id} question={q} showPublish={!showPublished} />
                        ))}
                    </ul>
                </>
            )}
        </main>
    );
}
