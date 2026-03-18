"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "primereact/button";
import { usePapers } from "../../papers-context";
import AutoLatex from "../../components/AutoLatex";
import QuestionAnswerFields, { useAnswerState } from "../../components/QuestionAnswerFields";

function EditAnswerPageContent() {
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

    const answerState = useAnswerState(question?.type ?? "free", question?.answer ?? "");
    const [error, setError] = useState("");

    const handleSave = async () => {
        if (!question) return;
        const resolvedAnswer = answerState.getResolvedAnswer(question.type);
        try {
            await updateQuestion(paperId, question.id, {
                type: question.type,
                prompt: question.prompt,
                answer: resolvedAnswer,
            });
            router.back();
        } catch (err) {
            console.error("Failed to update answer:", err);
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
                <h1 className="text-xl font-semibold">修改答案</h1>
            </div>

            <div className="mb-6 rounded border border-[var(--surface-border)] p-4">
                <AutoLatex text={question.prompt} />
            </div>

            <div className="flex flex-col gap-4">
                <QuestionAnswerFields
                    questionType={question.type}
                    questionAnswer={answerState.questionAnswer}
                    blankAnswers={answerState.blankAnswers}
                    choiceAnswers={answerState.choiceAnswers}
                    autoFocus
                    onQuestionAnswerChange={answerState.setQuestionAnswer}
                    onBlankAnswerChange={answerState.handleBlankAnswerChange}
                    onAddBlankAnswer={answerState.addBlankAnswer}
                    onRemoveBlankAnswer={answerState.removeBlankAnswer}
                    onChoiceAnswerChange={answerState.handleChoiceAnswerChange}
                    onAddChoiceAnswer={answerState.addChoiceAnswer}
                    onRemoveChoiceAnswer={answerState.removeChoiceAnswer}
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

export default function EditAnswerPage() {
    return (
        <Suspense>
            <EditAnswerPageContent />
        </Suspense>
    );
}
