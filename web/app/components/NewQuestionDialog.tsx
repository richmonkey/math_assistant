"use client";

import { useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputTextarea } from "primereact/inputtextarea";
import { QuestionType, usePapers } from "../papers-context";
import QuestionAnswerFields, { useAnswerState } from "./QuestionAnswerFields";

type NewQuestionDialogProps = {
    paperId: string;
};

export default function NewQuestionDialog({ paperId }: NewQuestionDialogProps) {
    const { addQuestion } = usePapers();
    const answerState = useAnswerState("single", "A");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [questionType, setQuestionType] = useState<QuestionType>("single");
    const [questionPrompt, setQuestionPrompt] = useState("");
    const [dialogError, setDialogError] = useState("");

    const openDialog = () => {
        setQuestionType("single");
        setQuestionPrompt("");
        answerState.resetAnswerState("single", "A");
        setDialogError("");
        setIsDialogOpen(true);
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
    };

    const handleAddQuestion = () => {
        const trimmedPrompt = questionPrompt.trim();
        const resolvedAnswer = answerState.getResolvedAnswer(questionType);

        if (!trimmedPrompt || !resolvedAnswer) {
            setDialogError("请填写题目内容和答案");
            return;
        }
        addQuestion(paperId, {
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
            <Button label="添加题目" icon="pi pi-plus" onClick={openDialog} />
            <Dialog
                header="新增题目"
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
                        <Button label="添加" icon="pi pi-check" onClick={handleAddQuestion} />
                    </div>
                </div>
            </Dialog>
        </>
    );
}
