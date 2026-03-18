"use client";

import { Button } from "primereact/button";
import { useRouter } from "next/navigation";
import { Question, usePapers } from "../papers-context";
import AutoLatex from "./AutoLatex";
import { useToast } from "../toast-context";

type QuestionItemProps = {
    paperId: string;
    question: Question;
    index: number;
};

const questionTypeLabels: Record<string, string> = {
    single: "单选题",
    multiple: "多选题",
    blank: "填空题",
    judge: "判断题",
    free: "解答题",
};

const formatAnswer = (type: string, answer: string) => {
    return answer;
};

export default function QuestionItem({
    paperId,
    question,
    index,
}: QuestionItemProps) {
    const hasNotesAPI = typeof window !== 'undefined' && window.notesAPI !== undefined;
    const { updateQuestionNoteId, deleteQuestion } = usePapers();
    const { showError, showMessage } = useToast();
    const router = useRouter();

    const handleCreateNote = async () => {
        if (!window.notesAPI) {
            return;
        }

        try {
            // 如果已有笔记 ID，直接打开
            if (question.noteId) {
                const res = await window.notesAPI.openNote(question.noteId);
                if (!res) {
                    showMessage({ detail: "无法打开旧笔记，可能已被删除。正在创建新笔记...", severity: "warn" });
                } else {
                    return;
                }
            }

            // 否则创建新笔记
            const noteContent = ``;
            const noteId = await window.notesAPI.createNote(noteContent);

            // 保存笔记 ID
            if (noteId) {
                updateQuestionNoteId(paperId, question.id, noteId);
            }
        } catch (error) {
            console.error("Failed to create/open note:", error);
            showError("操作笔记失败，请重试。", "错误");
        }
    };

    return (
        <li className="rounded border border-[var(--surface-border)] p-4">
            <div className="mb-2 flex items-center justify-between gap-4">
                <p className="text-sm text-[var(--muted)]">
                    第 {index + 1} 题 · {questionTypeLabels[question.type]}
                </p>
                <div className="flex gap-2">
                    {hasNotesAPI && (
                        <Button
                            label="笔记"
                            icon="pi pi-book"
                            outlined
                            onClick={handleCreateNote}
                        />
                    )}
                    <Button
                        label="答题"
                        icon="pi pi-file-edit"
                        outlined
                        onClick={() => router.push(`/papers/edit-answer?paperId=${paperId}&questionId=${question.id}`)}
                    />
                    <Button
                        label="问ai"
                        icon="pi pi-comments"
                        outlined
                        onClick={() =>
                            router.push(
                                `/papers/ask-ai?paperId=${encodeURIComponent(paperId)}&questionId=${encodeURIComponent(question.id)}`
                            )
                        }
                    />
                    <Button
                        label="编辑"
                        icon="pi pi-pencil"
                        outlined
                        onClick={() => router.push(`/papers/edit-question?paperId=${paperId}&questionId=${question.id}`)}
                    />
                    <Button
                        label="删除"
                        icon="pi pi-trash"
                        severity="danger"
                        outlined
                        onClick={() => {
                            deleteQuestion(paperId, question.id).catch((error) => {
                                console.error("Failed to delete question:", error);
                                showError("删除题目失败，请稍后重试。", "错误");
                            });
                        }}
                    />
                </div>
            </div>
            <AutoLatex className="mb-2 font-medium" text={question.prompt} />
            <AutoLatex
                className="rounded bg-[var(--hover)] p-3 text-sm"
                text={`解：${formatAnswer(question.type, question.answer)}`}
            />
        </li>
    );
}
