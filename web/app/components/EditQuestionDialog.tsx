"use client";

import { useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { QuestionType, usePapers, type Question } from "../papers-context";
import QuestionPromptField from "./QuestionPromptField";

type EditQuestionDialogProps = {
    paperId: string;
    question: Question;
    trigger?: React.ReactNode;
};

export default function EditQuestionDialog({
    paperId,
    question,
    trigger,
}: EditQuestionDialogProps) {
    const { updateQuestion } = usePapers();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [questionType, setQuestionType] = useState(question.type);
    const [questionPrompt, setQuestionPrompt] = useState(question.prompt);
    const [dialogError, setDialogError] = useState("");

    useEffect(() => {
        if (isDialogOpen) {
            setQuestionType(question.type);
            setQuestionPrompt(question.prompt);
            setDialogError("");
        }
    }, [isDialogOpen, question]);

    const openDialog = () => {
        setIsDialogOpen(true);
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
    };

    const handleUpdateQuestion = () => {
        const trimmedPrompt = questionPrompt.trim();

        if (!trimmedPrompt) {
            setDialogError("请填写题目内容");
            return;
        }
        updateQuestion(paperId, question.id, {
            type: questionType,
            prompt: trimmedPrompt,
        });
        setIsDialogOpen(false);
    };

    const handleQuestionTypeChange = (value: QuestionType) => {
        setQuestionType(value);
        setDialogError("");
    };

    return (
        <>
            {trigger ? (
                <div onClick={openDialog}>{trigger}</div>
            ) : (
                <Button label="编辑" icon="pi pi-pencil" outlined onClick={openDialog} />
            )}
            <Dialog
                header="编辑题目"
                visible={isDialogOpen}
                onHide={closeDialog}
                className="w-full max-w-lg"
            >
                <div className="flex flex-col gap-4 p-4">
                    <div>
                        <label className="mb-2 block text-sm text-[var(--foreground)]">题型</label>
                        <select
                            value={questionType}
                            onChange={(event) =>
                                handleQuestionTypeChange(event.target.value as QuestionType)
                            }
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
                        isDialogOpen={isDialogOpen}
                    />
                    {dialogError && <p className="text-sm text-red-400">{dialogError}</p>}
                    <div className="flex justify-end gap-2">
                        <Button label="取消" severity="secondary" outlined onClick={closeDialog} />
                        <Button label="保存" icon="pi pi-check" onClick={handleUpdateQuestion} />
                    </div>
                </div>
            </Dialog>
        </>
    );
}
