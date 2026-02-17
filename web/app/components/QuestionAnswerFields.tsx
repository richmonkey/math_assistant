"use client";

import { useRef, useState } from "react";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { QuestionType } from "../papers-context";
import { useToast } from "../toast-context";
import { performOcr } from "../lib/ocr";
import OcrPreviewModal from "./OcrPreviewModal";

const blankDelimiter = " | ";
const choiceDelimiter = ",";
const choiceOptions = ["A", "B", "C", "D"];

const splitBlankAnswers = (value: string) =>
    value
        .split(blankDelimiter)
        .map((item) => item.trim())
        .filter(Boolean);

const splitChoiceAnswers = (value: string) =>
    value
        .split(choiceDelimiter)
        .map((item) => item.trim())
        .filter(Boolean);

type AnswerState = {
    questionAnswer: string;
    blankAnswers: string[];
    choiceAnswers: string[];
};

const ensureBlankAnswers = (value: string) => {
    const derived = splitBlankAnswers(value);
    return derived.length ? derived : [""];
};

const ensureChoiceAnswers = (value: string) => {
    const derived = splitChoiceAnswers(value);
    return derived.length ? derived : ["A"];
};

const ensureSingleAnswer = (value: string, fallback = "A") => {
    const derived = splitChoiceAnswers(value);
    return derived[0] ?? fallback;
};

const createAnswerState = (type: QuestionType, answer: string): AnswerState => {
    if (type === "blank") {
        return {
            questionAnswer: answer,
            blankAnswers: ensureBlankAnswers(answer),
            choiceAnswers: ["A"],
        };
    }

    if (type === "multiple") {
        return {
            questionAnswer: answer,
            blankAnswers: [""],
            choiceAnswers: ensureChoiceAnswers(answer),
        };
    }

    if (type === "single") {
        return {
            questionAnswer: ensureSingleAnswer(answer),
            blankAnswers: [""],
            choiceAnswers: ["A"],
        };
    }

    return {
        questionAnswer: answer,
        blankAnswers: [""],
        choiceAnswers: ["A"],
    };
};

const normalizeAnswerState = (type: QuestionType, state: AnswerState): AnswerState => {
    if (type === "blank") {
        return {
            ...state,
            blankAnswers: state.blankAnswers.some((item) => item.trim())
                ? state.blankAnswers
                : ensureBlankAnswers(state.questionAnswer),
        };
    }

    if (type === "multiple") {
        return {
            ...state,
            choiceAnswers: state.choiceAnswers.some((item) => item.trim())
                ? state.choiceAnswers
                : ensureChoiceAnswers(state.questionAnswer),
        };
    }

    if (type === "single") {
        const fallback = state.choiceAnswers.find((item) => item.trim()) ?? "A";
        const nextAnswer = state.questionAnswer.trim()
            ? ensureSingleAnswer(state.questionAnswer, fallback)
            : fallback;
        return {
            ...state,
            questionAnswer: nextAnswer,
        };
    }

    return state;
};

const resolveAnswerValue = (type: QuestionType, state: AnswerState) => {
    if (type === "blank") {
        return state.blankAnswers
            .map((item) => item.trim())
            .filter(Boolean)
            .join(blankDelimiter);
    }

    if (type === "multiple") {
        return state.choiceAnswers
            .map((item) => item.trim())
            .filter(Boolean)
            .join(choiceDelimiter);
    }

    return state.questionAnswer.trim();
};

export const useAnswerState = (initialType: QuestionType, initialAnswer: string) => {
    const [state, setState] = useState<AnswerState>(() =>
        createAnswerState(initialType, initialAnswer)
    );

    const setQuestionAnswer = (value: string) => {
        setState((current) => ({ ...current, questionAnswer: value }));
    };

    const handleBlankAnswerChange = (index: number, value: string) => {
        setState((current) => ({
            ...current,
            blankAnswers: current.blankAnswers.map((item, itemIndex) =>
                itemIndex === index ? value : item
            ),
        }));
    };

    const addBlankAnswer = () => {
        setState((current) => ({
            ...current,
            blankAnswers: [...current.blankAnswers, ""],
        }));
    };

    const removeBlankAnswer = (index: number) => {
        setState((current) => {
            const next = current.blankAnswers.filter((_, itemIndex) => itemIndex !== index);
            return {
                ...current,
                blankAnswers: next.length ? next : [""],
            };
        });
    };

    const handleChoiceAnswerChange = (index: number, value: string) => {
        setState((current) => ({
            ...current,
            choiceAnswers: current.choiceAnswers.map((item, itemIndex) =>
                itemIndex === index ? value : item
            ),
        }));
    };

    const addChoiceAnswer = () => {
        setState((current) => {
            const nextOption = choiceOptions.find(
                (option) => !current.choiceAnswers.includes(option)
            );

            if (!nextOption) {
                return current;
            }

            return {
                ...current,
                choiceAnswers: [...current.choiceAnswers, nextOption],
            };
        });
    };

    const removeChoiceAnswer = (index: number) => {
        setState((current) => {
            const next = current.choiceAnswers.filter((_, itemIndex) => itemIndex !== index);
            return {
                ...current,
                choiceAnswers: next.length ? next : ["A"],
            };
        });
    };

    const resetAnswerState = (type: QuestionType, answer: string) => {
        setState(createAnswerState(type, answer));
    };

    const syncAnswerType = (type: QuestionType) => {
        setState((current) => normalizeAnswerState(type, current));
    };

    const getResolvedAnswer = (type: QuestionType) => resolveAnswerValue(type, state);

    return {
        questionAnswer: state.questionAnswer,
        blankAnswers: state.blankAnswers,
        choiceAnswers: state.choiceAnswers,
        setQuestionAnswer,
        handleBlankAnswerChange,
        addBlankAnswer,
        removeBlankAnswer,
        handleChoiceAnswerChange,
        addChoiceAnswer,
        removeChoiceAnswer,
        resetAnswerState,
        syncAnswerType,
        getResolvedAnswer,
    };
};

type QuestionAnswerFieldsProps = {
    questionType: QuestionType;
    questionAnswer: string;
    blankAnswers: string[];
    choiceAnswers: string[];
    onQuestionAnswerChange: (value: string) => void;
    onBlankAnswerChange: (index: number, value: string) => void;
    onAddBlankAnswer: () => void;
    onRemoveBlankAnswer: (index: number) => void;
    onChoiceAnswerChange: (index: number, value: string) => void;
    onAddChoiceAnswer: () => void;
    onRemoveChoiceAnswer: (index: number) => void;
};
export default function QuestionAnswerFields({
    questionType,
    questionAnswer,
    blankAnswers,
    choiceAnswers,
    onQuestionAnswerChange,
    onBlankAnswerChange,
    onAddBlankAnswer,
    onRemoveBlankAnswer,
    onChoiceAnswerChange,
    onAddChoiceAnswer,
    onRemoveChoiceAnswer,
}: QuestionAnswerFieldsProps) {
    const ocrInputRef = useRef<HTMLInputElement>(null);
    const [isOcring, setIsOcring] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [pendingOcrFile, setPendingOcrFile] = useState<File | null>(null);
    const { showError } = useToast();

    const clearPreviewState = () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(null);
        setPendingOcrFile(null);
        setIsPreviewOpen(false);
    };

    const handleOcrClick = () => {
        if (isOcring) {
            return;
        }
        ocrInputRef.current?.click();
    };

    const handleOcrChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files?.length) {
            return;
        }

        const file = event.target.files[0];
        event.target.value = "";

        if (!file) {
            return;
        }
        const nextUrl = URL.createObjectURL(file);
        setPreviewUrl(nextUrl);
        setPendingOcrFile(file);
        setIsPreviewOpen(true);
    };

    const handlePreviewConfirm = async (croppedFile: File | null) => {
        if (!pendingOcrFile) {
            return;
        }
        try {
            setIsOcring(true);
            const fileForOcr = croppedFile ?? pendingOcrFile;
            const ocrText = await performOcr(fileForOcr);
            const nextValue = questionAnswer.trim()
                ? `${questionAnswer}\n${ocrText}`
                : ocrText;
            onQuestionAnswerChange(nextValue);
            clearPreviewState();
        } catch (error) {
            console.error("OCR failed:", error);
            showError("请确保上传的是清晰的图片，并且只包含打印内容。", "OCR 失败");
        } finally {
            setIsOcring(false);
        }
    };

    return (
        <div>
            <OcrPreviewModal
                isOpen={isPreviewOpen}
                previewUrl={previewUrl}
                isOcring={isOcring}
                onCancel={clearPreviewState}
                onConfirm={handlePreviewConfirm}
            />
            <label className="mb-2 block text-sm text-[var(--foreground)]">答案</label>
            {questionType === "blank" ? (
                <div className="flex flex-col gap-3">
                    {blankAnswers.map((answer, index) => (
                        <div key={`blank-${index}`} className="flex items-center gap-2">
                            <InputText
                                value={answer}
                                onChange={(event) => onBlankAnswerChange(index, event.target.value)}
                                className="flex-1"
                                placeholder={`空位 ${index + 1}`}
                            />
                            <Button
                                icon="pi pi-trash"
                                severity="secondary"
                                outlined
                                onClick={() => onRemoveBlankAnswer(index)}
                            />
                        </div>
                    ))}
                    <Button
                        label="新增空位"
                        icon="pi pi-plus"
                        severity="secondary"
                        outlined
                        onClick={onAddBlankAnswer}
                    />
                </div>
            ) : questionType === "multiple" ? (
                <div className="flex flex-col gap-3">
                    {choiceAnswers.map((answer, index) => (
                        <div key={`choice-${index}`} className="flex items-center gap-2">
                            <select
                                value={answer}
                                onChange={(event) =>
                                    onChoiceAnswerChange(index, event.target.value)
                                }
                                className="flex-1 rounded border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
                            >
                                {choiceOptions.map((option) => (
                                    <option
                                        key={option}
                                        value={option}
                                        disabled={
                                            option !== answer &&
                                            choiceAnswers.some(
                                                (selected, selectedIndex) =>
                                                    selectedIndex !== index && selected === option
                                            )
                                        }
                                    >
                                        {option}
                                    </option>
                                ))}
                            </select>
                            <Button
                                icon="pi pi-trash"
                                severity="secondary"
                                outlined
                                onClick={() => onRemoveChoiceAnswer(index)}
                            />
                        </div>
                    ))}
                    <Button
                        label="新增选项"
                        icon="pi pi-plus"
                        severity="secondary"
                        outlined
                        onClick={onAddChoiceAnswer}
                    />
                </div>
            ) : questionType === "essay" ? (
                <div className="flex items-start gap-2">
                    <InputTextarea
                        value={questionAnswer}
                        onChange={(event) => onQuestionAnswerChange(event.target.value)}
                        className="flex-1"
                        rows={3}
                    />
                    <div className="flex flex-col">
                        <Button
                            label="+"
                            outlined
                            severity="secondary"
                            onClick={handleOcrClick}
                            disabled={isOcring}
                            aria-label="OCR 识别并插入"
                        />
                        <input
                            ref={ocrInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleOcrChange}
                        />
                    </div>
                </div>
            ) : questionType === "single" ? (
                <div className="flex flex-col gap-2">
                    <select
                        value={questionAnswer}
                        onChange={(event) => onQuestionAnswerChange(event.target.value)}
                        className="w-full rounded border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
                    >
                        {choiceOptions.map((option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                </div>
            ) : null}
        </div>
    );
}
