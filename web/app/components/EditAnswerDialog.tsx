"use client";

import { useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { type Question, usePapers } from "../papers-context";
import AutoLatex from "./AutoLatex";
import QuestionAnswerFields, { useAnswerState } from "./QuestionAnswerFields";

type EditAnswerDialogProps = {
    paperId: string;
    question: Question;
    trigger?: React.ReactNode;
};


export default function EditAnswerDialog({
    paperId,
    question,
    trigger,
}: EditAnswerDialogProps) {
    const { updateQuestion } = usePapers();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const answerState = useAnswerState(question.type, question.answer ?? "");

    useEffect(() => {
        if (isDialogOpen) {
            answerState.resetAnswerState(question.type, question.answer ?? "");
        }
    }, [isDialogOpen, question]);

    const openDialog = () => {
        setIsDialogOpen(true);
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
    };

    const handleSaveAnswer = () => {
        const resolvedAnswer = answerState.getResolvedAnswer(question.type);
        updateQuestion(paperId, question.id, {
            type: question.type,
            prompt: question.prompt,
            answer: resolvedAnswer,
        });
        setIsDialogOpen(false);
    };

    return (
        <>
            {trigger ? (
                <div onClick={openDialog}>{trigger}</div>
            ) : (
                <Button label="答案" icon="pi pi-file-edit" outlined onClick={openDialog} />
            )}
            <Dialog
                header="修改答案"
                visible={isDialogOpen}
                onHide={closeDialog}
                className="w-full max-w-lg"
            >
                <div className="flex flex-col gap-4 p-4">

                    <QuestionAnswerFields
                        questionType={question.type}
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
                    <div className="flex justify-end gap-2">
                        <Button label="取消" severity="secondary" outlined onClick={closeDialog} />
                        <Button label="保存" icon="pi pi-check" onClick={handleSaveAnswer} />
                    </div>
                </div>
            </Dialog>
        </>
    );
}
