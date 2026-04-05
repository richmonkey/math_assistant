"use client";

import { createContext, useCallback, useContext, useState } from "react";
import {
    BankQuestionResponse,
    listBankQuestions,
    updateBankQuestion,
    publishBankQuestion,
} from "../lib/bank-questions-api";

export type QuestionType = "single" | "multiple" | "blank" | "judge" | "free";

export type BankQuestionDraft = {
    prompt: string;
    type: QuestionType;
    referenceImageUrl: string | null;
};

type BankQuestionsContextValue = {
    questions: BankQuestionResponse[];
    isLoading: boolean;
    loadError: string;
    loadQuestions: (isPublished?: boolean) => Promise<void>;
    getEffective: (question: BankQuestionResponse) => BankQuestionDraft;
    hasDraft: (id: string) => boolean;
    saveDraft: (id: string, draft: BankQuestionDraft) => void;
    saveQuestion: (id: string, draft: BankQuestionDraft) => Promise<void>;
    publishQuestion: (id: string) => Promise<void>;
};

const BankQuestionsContext = createContext<BankQuestionsContextValue | null>(null);

export function BankQuestionsProvider({ children }: { children: React.ReactNode }) {
    const [questions, setQuestions] = useState<BankQuestionResponse[]>([]);
    const [drafts, setDrafts] = useState<Record<string, BankQuestionDraft>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [loadError, setLoadError] = useState("");

    const loadQuestions = useCallback(async (isPublished: boolean = false) => {
        setIsLoading(true);
        setLoadError("");
        try {
            const data = await listBankQuestions(isPublished);
            setQuestions(data);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "加载失败";
            setLoadError(msg);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const getEffective = useCallback(
        (question: BankQuestionResponse): BankQuestionDraft =>
            drafts[question.id] ?? {
                prompt: question.prompt,
                type: question.type as QuestionType,
                referenceImageUrl: question.reference_image_url ?? null,
            },
        [drafts]
    );

    const hasDraft = useCallback((id: string) => id in drafts, [drafts]);

    const saveDraft = useCallback((id: string, draft: BankQuestionDraft) => {
        setDrafts((prev) => ({ ...prev, [id]: draft }));
    }, []);

    const saveQuestion = useCallback(
        async (id: string, draft: BankQuestionDraft) => {
            const question = questions.find((q) => q.id === id);
            if (!question) throw new Error("Question not found");
            const updated = await updateBankQuestion(id, {
                prompt: draft.prompt,
                answer: question.answer,
                type: draft.type,
                reference_image_url: draft.referenceImageUrl,
            });
            setQuestions((prev) =>
                prev.map((q) => (q.id === id ? updated : q))
            );
            setDrafts((prev) => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
        },
        [questions]
    );

    const publishQuestion = useCallback(
        async (id: string) => {
            await publishBankQuestion(id);
            setQuestions((prev) => prev.filter((q) => q.id !== id));
            setDrafts((prev) => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
        },
        []
    );

    return (
        <BankQuestionsContext.Provider
            value={{ questions, isLoading, loadError, loadQuestions, getEffective, hasDraft, saveDraft, saveQuestion, publishQuestion }}
        >
            {children}
        </BankQuestionsContext.Provider>
    );
}

export function useBankQuestions() {
    const ctx = useContext(BankQuestionsContext);
    if (!ctx) {
        throw new Error("useBankQuestions must be used within BankQuestionsProvider");
    }
    return ctx;
}
