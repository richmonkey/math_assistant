"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "primereact/button";
import { QuestionType, usePapers } from "../../papers-context";
import QuestionPromptField from "../../components/QuestionPromptField";
import ReferenceImageField from "../../components/ReferenceImageField";

function NewQuestionPageContent() {
    const searchParams = useSearchParams();
    const paperId = searchParams.get("paperId") ?? "";
    const { getPaperById, addQuestion } = usePapers();
    const paper = useMemo(() => getPaperById(paperId), [getPaperById, paperId]);
    const router = useRouter();

    const [questionType, setQuestionType] = useState<QuestionType>("single");
    const [questionPrompt, setQuestionPrompt] = useState("");
    const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
    const [error, setError] = useState("");

    const returnToPaperDetail = () => {
        router.push(`/papers?paperId=${encodeURIComponent(paperId)}`);
    };

    const handleSave = async () => {
        const trimmedPrompt = questionPrompt.trim();
        if (!trimmedPrompt) {
            setError("请填写题目内容");
            return;
        }

        try {
            await addQuestion(paperId, {
                type: questionType,
                prompt: trimmedPrompt,
                referenceImageUrl,
            });
            returnToPaperDetail();
        } catch (error) {
            console.error("Failed to add question:", error);
            setError("添加题目失败，请检查登录状态或稍后重试");
        }
    };

    if (!paper) {
        return (
            <div className="flex h-full items-center justify-center p-6">
                <p className="text-[var(--muted)]">试卷不存在</p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-2xl p-6">
            <div className="mb-6 flex items-center gap-3">
                <Button
                    icon="pi pi-arrow-left"
                    text
                    onClick={returnToPaperDetail}
                    aria-label="返回"
                />
                <h1 className="text-xl font-semibold">新增题目</h1>
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
                        <option value="judge">判断题</option>
                        <option value="free">解答题</option>
                    </select>
                </div>
                <QuestionPromptField
                    value={questionPrompt}
                    onChange={setQuestionPrompt}
                    isDialogOpen={true}
                />
                <ReferenceImageField
                    value={referenceImageUrl}
                    onChange={setReferenceImageUrl}
                />
                {error && <p className="text-sm text-red-400">{error}</p>}
                <div className="flex justify-end gap-2">
                    <Button label="取消" severity="secondary" outlined onClick={returnToPaperDetail} />
                    <Button label="添加" icon="pi pi-check" onClick={handleSave} />
                </div>
            </div>
        </div>
    );
}

export default function NewQuestionPage() {
    return (
        <Suspense>
            <NewQuestionPageContent />
        </Suspense>
    );
}
