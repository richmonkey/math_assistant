"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import AutoLatex from "../../components/AutoLatex";
import { useToast } from "../../toast-context";
import { usePapers, type QuestionType } from "../../papers-context";

type ImportQuestionType =
    | "multiple_choice"
    | "fill_blank"
    | "calculation"
    | "proof"
    | "unknown";

type ImportQuestion = {
    id: string;
    number: string;
    type: ImportQuestionType;
    content: string;
};

type ImportPayload = {
    questions: Omit<ImportQuestion, "id">[];
};

const questionTypeLabels: Record<ImportQuestionType, string> = {
    multiple_choice: "选择题",
    fill_blank: "填空题",
    calculation: "计算题",
    proof: "证明题",
    unknown: "未知类型",
};

const normalizeQuestions = (payload: ImportPayload | null) => {
    if (!payload?.questions?.length) {
        return [] as ImportQuestion[];
    }

    return payload.questions.map((question, index) => ({
        id: `import-${Date.now()}-${index}`,
        number: question.number || `${index + 1}`,
        type: question.type ?? "unknown",
        content: question.content ?? "",
        options: [],
    }));
};

function ImportPreviewPageContent() {
    const searchParams = useSearchParams();
    const paperId = searchParams.get("paperId") ?? "";
    const router = useRouter();
    const { showError } = useToast();
    const { addQuestionsFromImport } = usePapers();
    const [questions, setQuestions] = useState<ImportQuestion[]>([]);

    const mapImportType = (importType: ImportQuestionType): QuestionType => {
        switch (importType) {
            case "multiple_choice":
                return "single";
            case "fill_blank":
                return "blank";
            case "calculation":
            case "proof":
                return "essay";
            case "unknown":
            default:
                return "essay";
        }
    };

    const storageKey = useMemo(() => {
        if (!paperId) {
            return "";
        }
        return `import-preview-${paperId}`;
    }, [paperId]);

    const handleImport = () => {
        if (questions.length === 0) {
            showError("没有题目可导入", "导入失败");
            return;
        }

        try {
            const importInputs = questions.map((question) => ({
                type: mapImportType(question.type),
                prompt: question.content,
                answer: "",
            }));

            addQuestionsFromImport(paperId, importInputs);
            sessionStorage.removeItem(storageKey);
            router.push(`/papers?paperId=${encodeURIComponent(paperId)}`);
        } catch (error) {
            console.error("Failed to import questions:", error);
            showError("导入失败，请稍后重试。", "导入失败");
        }
    };

    useEffect(() => {
        if (!storageKey) {
            return;
        }
        try {
            const stored = sessionStorage.getItem(storageKey);
            if (!stored) {
                return;
            }
            const parsed = JSON.parse(stored) as ImportPayload;
            setQuestions(normalizeQuestions(parsed));
        } catch (error) {
            console.error("Failed to parse import preview:", error);
            showError("导入预览数据解析失败，请重新导入试卷。", "导入失败");
        }
    }, [storageKey, showError]);

    const openEditPage = (question: ImportQuestion) => {
        // Persist current state (with ids) so the edit page can read/update it
        sessionStorage.setItem(storageKey, JSON.stringify({ questions }));
        router.push(
            `/papers/import-preview/edit-question?paperId=${encodeURIComponent(paperId)}&questionId=${encodeURIComponent(question.id)}`
        );
    };

    const handleDeleteQuestion = (id: string) => {
        setQuestions((current) => current.filter((item) => item.id !== id));
    };

    return (
        <main className="mx-auto max-w-4xl p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold">导入预览</h1>
                    <p className="text-sm text-[var(--muted)]">请检查 OCR 结果并进行编辑</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        label="导入"
                        icon="pi pi-download"
                        onClick={handleImport}
                    />
                    <Link
                        href={`/papers?paperId=${encodeURIComponent(paperId)}`}
                        className="rounded border border-[var(--surface-border)] px-3 py-2 text-sm transition-colors hover:bg-[var(--hover)]"
                    >
                        返回试卷
                    </Link>
                </div>
            </div>

            {questions.length === 0 ? (
                <section className="rounded border border-[var(--surface-border)] bg-[var(--surface)] p-6 text-center">
                    <p className="text-[var(--muted)]">暂无可预览的题目，请重新导入试卷。</p>
                </section>
            ) : (
                <section className="rounded border border-[var(--surface-border)] bg-[var(--surface)] p-5">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-lg font-semibold">题目预览</h2>
                        <span className="text-sm text-[var(--muted)]">共 {questions.length} 题</span>
                    </div>

                    <ul className="space-y-3">
                        {questions.map((question, index) => (
                            <li
                                key={question.id}
                                className="rounded border border-[var(--surface-border)] p-4"
                            >
                                <div className="mb-2 flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <p className="text-sm text-[var(--muted)]">
                                            第 {question.number || index + 1} 题 · {questionTypeLabels[question.type]}
                                        </p>
                                        <AutoLatex
                                            text={question.content || "（未识别到题干）"}
                                            className="mt-1 font-medium"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            label="编辑"
                                            icon="pi pi-pencil"
                                            outlined
                                            onClick={() => openEditPage(question)}
                                        />
                                        <Button
                                            label="删除"
                                            icon="pi pi-trash"
                                            severity="danger"
                                            outlined
                                            onClick={() => handleDeleteQuestion(question.id)}
                                        />
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </main>
    );
}

export default function ImportPreviewPage() {
    return (
        <Suspense fallback={<main className="mx-auto max-w-4xl p-6" />}>
            <ImportPreviewPageContent />
        </Suspense>
    );
}
