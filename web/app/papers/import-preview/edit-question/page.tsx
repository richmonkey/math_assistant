"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Button } from "primereact/button";

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

function EditImportQuestionPageContent() {
    const searchParams = useSearchParams();
    const paperId = searchParams.get("paperId") ?? "";
    const questionId = searchParams.get("questionId") ?? "";
    const router = useRouter();

    const storageKey = paperId ? `import-preview-${paperId}` : "";

    const [question, setQuestion] = useState<ImportQuestion | null>(null);
    const [draftNumber, setDraftNumber] = useState("");
    const [draftType, setDraftType] = useState<ImportQuestionType>("unknown");
    const [draftContent, setDraftContent] = useState("");

    useEffect(() => {
        if (!storageKey) return;
        try {
            const stored = sessionStorage.getItem(storageKey);
            if (!stored) return;
            const parsed = JSON.parse(stored) as { questions: ImportQuestion[] };
            const found = parsed.questions.find((q) => q.id === questionId);
            if (!found) return;
            setQuestion(found);
            setDraftNumber(found.number);
            setDraftType(found.type);
            setDraftContent(found.content);
        } catch (error) {
            console.error("Failed to load import preview question:", error);
        }
    }, [storageKey, questionId]);

    const handleSave = () => {
        if (!question || !storageKey) return;
        try {
            const stored = sessionStorage.getItem(storageKey);
            if (!stored) return;
            const parsed = JSON.parse(stored) as { questions: ImportQuestion[] };
            const updated = {
                ...parsed,
                questions: parsed.questions.map((q) =>
                    q.id === questionId
                        ? {
                            ...q,
                            number: draftNumber.trim() || q.number,
                            type: draftType,
                            content: draftContent.trim(),
                        }
                        : q
                ),
            };
            sessionStorage.setItem(storageKey, JSON.stringify(updated));
        } catch (error) {
            console.error("Failed to save import preview question:", error);
        }
        router.back();
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                    <label className="mb-2 block text-sm text-[var(--foreground)]">题号</label>
                    <InputText
                        value={draftNumber}
                        onChange={(e) => setDraftNumber(e.target.value)}
                        className="w-full"
                    />
                </div>
                <div>
                    <label className="mb-2 block text-sm text-[var(--foreground)]">题型</label>
                    <select
                        value={draftType}
                        onChange={(e) => setDraftType(e.target.value as ImportQuestionType)}
                        className="w-full rounded border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
                    >
                        <option value="multiple_choice">选择题</option>
                        <option value="fill_blank">填空题</option>
                        <option value="calculation">计算题</option>
                        <option value="proof">证明题</option>
                        <option value="unknown">未知类型</option>
                    </select>
                </div>
            </div>
            <div>
                <label className="mb-2 block text-sm text-[var(--foreground)]">题干</label>
                <InputTextarea
                    value={draftContent}
                    onChange={(e) => setDraftContent(e.target.value)}
                    className="w-full"
                    rows={6}
                />
            </div>
            <p className="text-sm text-[var(--muted)]">选择题选项不可编辑。</p>
            <div className="flex justify-end gap-2">
                <Button label="取消" severity="secondary" outlined onClick={() => router.back()} />
                <Button label="保存" icon="pi pi-check" onClick={handleSave} />
            </div>
        </div>
    );
}

export default function EditImportQuestionPage() {
    return (
        <Suspense>
            <EditImportQuestionPageContent />
        </Suspense>
    );
}
