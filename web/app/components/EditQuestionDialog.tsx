"use client";

import { useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputTextarea } from "primereact/inputtextarea";
import { QuestionType, usePapers, type Question } from "../papers-context";
import QuestionAnswerFields, { useAnswerState } from "./QuestionAnswerFields";

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
    const answerState = useAnswerState(question.type, question.answer);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [questionType, setQuestionType] = useState(question.type);
    const [questionPrompt, setQuestionPrompt] = useState(question.prompt);
    const [dialogError, setDialogError] = useState("");

    useEffect(() => {
        if (isDialogOpen) {
            setQuestionType(question.type);
            setQuestionPrompt(question.prompt);
            answerState.resetAnswerState(question.type, question.answer);
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
        const resolvedAnswer = answerState.getResolvedAnswer(questionType);

        if (!trimmedPrompt) {
            setDialogError("请填写题目内容");
            return;
        }
        updateQuestion(paperId, question.id, {
            type: questionType,
            prompt: trimmedPrompt,
            answer: resolvedAnswer,
        });
        setIsDialogOpen(false);
    };

    const handleQuestionTypeChange = (value: QuestionType) => {
        setQuestionType(value);
        setDialogError("");
        answerState.syncAnswerType(value);
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
                    <div>
                        <label className="mb-2 block text-sm text-[var(--foreground)]">题目内容</label>
                        <InputTextarea
                            value={questionPrompt}
                            onChange={(event) => setQuestionPrompt(event.target.value)}
                            className="w-full"
                            rows={4}
                        />
                    </div>
                    <QuestionAnswerFields
                        questionType={questionType}
                        questionAnswer={answerState.questionAnswer}
                        blankAnswers={answerState.blankAnswers}
                        choiceAnswers={answerState.choiceAnswers}
                        onQuestionAnswerChange={answerState.setQuestionAnswer}
                        onBlankAnswerChange={answerState.handleBlankAnswerChange}
                        onAddBlankAnswer={answerState.addBlankAnswer}
                        onRemoveBlankAnswer={answerState.removeBlankAnswer}
                        onChoiceAnswerChange={answerState.handleChoiceAnswerChange}
                        onAddChoiceAnswer={answerState.addChoiceAnswer}
                        onRemoveChoiceAnswer={answerState.removeChoiceAnswer}
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
