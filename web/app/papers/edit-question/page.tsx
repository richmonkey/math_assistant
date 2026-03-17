"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "primereact/button";
import { QuestionType, usePapers } from "../../papers-context";
import QuestionPromptField from "../../components/QuestionPromptField";

function EditQuestionPageContent() {
    const searchParams = useSearchParams();
    const paperId = searchParams.get("paperId") ?? "";
    const questionId = searchParams.get("questionId") ?? "";
    const { getPaperById, updateQuestion } = usePapers();
    const paper = useMemo(() => getPaperById(paperId), [getPaperById, paperId]);
    const question = useMemo(
        () => paper?.questions.find((q) => q.id === questionId),
        [paper, questionId]
    );
    const router = useRouter();

    const [questionType, setQuestionType] = useState<QuestionType>(question?.type ?? "essay");
    const [questionPrompt, setQuestionPrompt] = useState(question?.prompt ?? "");
    const [error, setError] = useState("");

    const handleSave = async () => {
        const trimmedPrompt = questionPrompt.trim();
        if (!trimmedPrompt) {
            setError("请填写题目内容");
            return;
        }
        try {
            await updateQuestion(paperId, questionId, {
                type: questionType,
                prompt: trimmedPrompt,
            });
            router.back();
        } catch (err) {
            console.error("Failed to update question:", err);
            setError("保存失败，请检查登录状态或稍后重试");
        }
    };

    if (!question) {
        return (
            <div className="flex h-full items-center justify-center">
                <p className="text-[var(--muted)]">题目不存在</p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-2xl p-6">
            <div className="mb-6 flex items-center gap-3">
                <Button
                    icon="pi pi-arrow-left"
                    text
                    onClick={() => router.back()}
                    aria-label="返回"
                />
                <h1 className="text-xl font-semibold">编辑题目</h1>
            </div>

            <div className="flex flex-col gap-4">
                <div>
                    <label className="mb-2 block text-sm text-[var(--foreground)]">题型</label>
                    <select
                        value={questionType}
                        onChange={(e) => {
                            setQuestionType(e.target.value as QuestionType);
                            setError("");
                        }}
                        className="w-full rounded border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
                    >
                        <option value="single">单选题</option>
                        <option value="multiple">多选题</option>
                        <option value="blank">填空题</option>
                        <option value="essay">解答题</option>
                    </select>
                </div>
                <QuestionPromptField
                    value={questionPrompt}
                    onChange={setQuestionPrompt}
                    isDialogOpen={true}
                />
                {error && <p className="text-sm text-red-400">{error}</p>}
                <div className="flex justify-end gap-2">
                    <Button label="取消" severity="secondary" outlined onClick={() => router.back()} />
                    <Button label="保存" icon="pi pi-check" onClick={handleSave} />
                </div>
            </div>
        </div>
    );
}

export default function EditQuestionPage() {
    return (
        <Suspense>
            <EditQuestionPageContent />
        </Suspense>
    );
}
