"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "primereact/button";
import { useBankQuestions, QuestionType, BankQuestionDraft } from "../bank-questions-context";
import QuestionPromptField from "../../components/QuestionPromptField";
import ReferenceImageField from "../../components/ReferenceImageField";
const questionTypeOptions: { value: QuestionType; label: string }[] = [
    { value: "single", label: "单选题" },
    { value: "multiple", label: "多选题" },
    { value: "blank", label: "填空题" },
    { value: "judge", label: "判断题" },
    { value: "free", label: "解答题" },
];

function EditBankQuestionContent() {
    const searchParams = useSearchParams();
    const questionId = searchParams.get("questionId") ?? "";
    const router = useRouter();
    const { questions, getEffective, saveQuestion } = useBankQuestions();

    const question = questions.find((q) => q.id === questionId) ?? null;
    const initial: BankQuestionDraft | null = question ? getEffective(question) : null;

    const [questionType, setQuestionType] = useState<QuestionType>(initial?.type ?? "free");
    const [prompt, setPrompt] = useState(initial?.prompt ?? "");
    const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(
        initial?.referenceImageUrl ?? null
    );
    const [error, setError] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        const trimmed = prompt.trim();
        if (!trimmed) {
            setError("请填写题目内容");
            return;
        }
        setIsSaving(true);
        try {
            await saveQuestion(questionId, { prompt: trimmed, type: questionType, referenceImageUrl });
            router.back();
        } catch {
            setError("保存失败，请检查登录状态或稍后重试");
        } finally {
            setIsSaving(false);
        }
    };

    if (!question) {
        return (
            <div className="flex h-full items-center justify-center">
                <p className="text-[var(--muted)]">题目不存在，请返回列表页后重试</p>
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
                <h1 className="text-xl font-semibold">编辑题目内容</h1>
            </div>

            {question.content_image_url && (
                <div className="mb-4">
                    <p className="mb-1 text-sm text-[var(--muted)]">题目原图</p>
                    <a href={question.content_image_url} target="_blank" rel="noreferrer">
                        <img
                            src={question.content_image_url}
                            alt="题目图片"
                            className="max-h-64 cursor-pointer rounded border border-[var(--surface-border)] object-contain hover:opacity-80"
                        />
                    </a>
                </div>
            )}

            {question.standard_answer_image_url && (
                <div className="mb-4">
                    <p className="mb-1 text-sm text-[var(--muted)]">标准答案图片</p>
                    <a href={question.standard_answer_image_url} target="_blank" rel="noreferrer">
                        <img
                            src={question.standard_answer_image_url}
                            alt="标准答案"
                            className="max-h-48 cursor-pointer rounded border border-[var(--surface-border)] object-contain hover:opacity-80"
                        />
                    </a>
                </div>
            )}

            <div className="flex flex-col gap-4">
                <div>
                    <label className="mb-2 block text-sm text-[var(--foreground)]">题型</label>
                    <select
                        value={questionType}
                        onChange={(e) => setQuestionType(e.target.value as QuestionType)}
                        className="w-full rounded border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
                    >
                        {questionTypeOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>
                <QuestionPromptField
                    value={prompt}
                    onChange={(v) => {
                        setPrompt(v);
                        setError("");
                    }}
                    isDialogOpen={true}
                    autoFocus
                />
                <ReferenceImageField
                    value={referenceImageUrl}
                    onChange={setReferenceImageUrl}
                />
                {error && <p className="text-sm text-red-400">{error}</p>}
                <div className="flex justify-end gap-2">
                    <Button
                        label="取消"
                        severity="secondary"
                        outlined
                        onClick={() => router.back()}
                    />
                    <Button label="保存" icon="pi pi-check" loading={isSaving} onClick={handleSave} />
                </div>
            </div>
        </div>
    );
}

export default function EditBankQuestionPage() {
    return (
        <Suspense>
            <EditBankQuestionContent />
        </Suspense>
    );
}

