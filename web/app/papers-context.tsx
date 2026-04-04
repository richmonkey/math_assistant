"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
    createPaper,
    createQuestion,
    deleteQuestionApi,
    getPaperDetail,
    listPapers,
    type ServerPaperDetailResponse,
    type ServerPaperGradingResultResponse,
    type ServerPaperResponse,
    type ServerQuestionGradingResultResponse,
    type ServerQuestionResponse,
    updateQuestionApi,
    uploadPaperGradingResult,
    uploadQuestionGradingResult,
} from "./lib/papers-api";
import { hasValidSession } from "./lib/auth";

type GradingResult = {
    totalScore: number;
    maxTotalScore: number;
    overallComment: string;
};

type QuestionGradingResult = {
    score: number;
    maxScore: number;
    comment: string;
    isCorrect: boolean;
};

type SaveGradingResultInput = GradingResult & {
    questionResults: Array<{
        questionId: string;
    } & QuestionGradingResult>;
};

type Paper = {
    id: string;
    title: string;
    description: string;
    updatedAt: string;
    questions: Question[];
    gradingResult?: GradingResult;
};

type QuestionType = "single" | "multiple" | "blank" | "judge" | "free";

type Question = {
    id: string;
    type: QuestionType;
    prompt: string;
    answer: string;
    referenceImageUrl?: string;
    noteId?: string;
    sessionId?: string;
    gradingResult?: QuestionGradingResult;
};

type PaperInput = {
    title: string;
    description?: string;
};

type PaperUpdate = Partial<Omit<Paper, "id">>;

type PapersContextValue = {
    papers: Paper[];
    syncPapersFromServer: () => Promise<void>;
    addPaper: (input: PaperInput) => Promise<Paper>;
    updatePaper: (id: string, update: PaperUpdate) => Promise<void>;
    addQuestion: (paperId: string, input: QuestionInput) => Promise<Question>;
    updateQuestion: (paperId: string, questionId: string, update: QuestionInput) => Promise<void>;
    updateQuestionNoteId: (paperId: string, questionId: string, noteId: string) => void;
    updateQuestionSessionId: (paperId: string, questionId: string, sessionId: string) => void;
    deleteQuestion: (paperId: string, questionId: string) => Promise<void>;
    getPaperById: (id: string) => Paper | undefined;
    syncPaperById: (id: string) => Promise<Paper>;
    addQuestionsFromImport: (paperId: string, inputs: ImportQuestionInput[]) => Promise<boolean>;
    saveGradingResult: (paperId: string, result: SaveGradingResultInput) => Promise<void>;
};

const defaultPapers: Paper[] = [];

const storageKey = "papers";

const PapersContext = createContext<PapersContextValue | null>(null);

function mapServerQuestion(question: ServerQuestionResponse): Question {
    return {
        id: question.id,
        type: question.type,
        prompt: question.prompt,
        answer: question.answer,
        referenceImageUrl: question.reference_image_url ?? undefined,
        sessionId: question.session_id,
    };
}

function mapServerQuestionGradingResult(
    result: ServerQuestionGradingResultResponse
): QuestionGradingResult {
    return {
        score: result.score,
        maxScore: result.max_score,
        comment: result.comment,
        isCorrect: result.is_correct,
    };
}

function mapServerPaperGradingResult(
    result: ServerPaperGradingResultResponse
): GradingResult {
    return {
        totalScore: result.score,
        maxTotalScore: result.max_score,
        overallComment: result.comment,
    };
}

function mapServerPaperDetail(detail: ServerPaperDetailResponse): Paper {
    return {
        id: detail.id,
        title: detail.title,
        description: detail.description ?? "",
        updatedAt: detail.updated_at,
        gradingResult: detail.grading_result
            ? mapServerPaperGradingResult(detail.grading_result)
            : undefined,
        questions: detail.questions.map((question) => ({
            ...mapServerQuestion(question),
            gradingResult: question.grading_result
                ? mapServerQuestionGradingResult(question.grading_result)
                : undefined,
        })),
    };
}

function mapServerPaper(paper: ServerPaperResponse): Paper {
    return {
        id: paper.id,
        title: paper.title,
        description: paper.description ?? "",
        updatedAt: paper.updated_at,
        questions: [],
    };
}

export function PapersProvider({ children }: { children: React.ReactNode }) {
    const [papers, setPapers] = useState<Paper[]>(() => {
        if (typeof window === "undefined") {
            return defaultPapers;
        }

        const stored = window.localStorage.getItem(storageKey);
        if (!stored) {
            return defaultPapers;
        }

        try {
            const parsed = JSON.parse(stored) as Paper[];
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
        } catch {
            // Ignore parse failures and fallback to defaults.
        }

        return defaultPapers;
    });

    const syncPapersFromServer = useCallback(async () => {
        if (!hasValidSession()) {
            return;
        }

        try {
            const summaries = await listPapers();
            const remoteIds = new Set(summaries.map((s) => s.id));

            setPapers((current) => {
                const localById = new Map(current.map((p) => [p.id, p]));

                // Build updated list: keep local papers that exist on server,
                // update their summary fields, and append new ones from server.
                const updated: Paper[] = summaries.map((summary) => {
                    const local = localById.get(summary.id);
                    if (local) {
                        // Update summary fields from server, preserve local-only fields
                        return {
                            ...local,
                            title: summary.title,
                            description: summary.description ?? "",
                            updatedAt: summary.updated_at,
                        };
                    }
                    return mapServerPaper(summary);
                });

                // Remove papers that no longer exist on server
                return updated.filter((p) => remoteIds.has(p.id));
            });
        } catch (error) {
            console.error("Failed to sync papers from server:", error);
        }
    }, []);

    useEffect(() => {
        window.localStorage.setItem(storageKey, JSON.stringify(papers));
    }, [papers]);

    const addPaper = async (input: PaperInput) => {
        try {
            const created = await createPaper({
                title: input.title,
                description: input.description || null,
            });
            const serverPaper = mapServerPaper(created);
            setPapers((current) => [serverPaper, ...current]);
            return serverPaper;
        } catch (error) {
            console.error("Failed to create paper:", error);
            throw error;
        }
    };

    const updatePaper = async (id: string, update: PaperUpdate) => {
        setPapers((current) =>
            current.map((paper) =>
                paper.id === id
                    ? {
                        ...paper,
                        ...update,
                        updatedAt: new Date().toISOString(),
                    }
                    : paper
            )
        );
    };

    const addQuestion = async (paperId: string, input: QuestionInput) => {
        try {
            const created = await createQuestion({
                paperId,
                type: input.type,
                prompt: input.prompt,
                answer: input.answer ?? "",
                referenceImageUrl: input.referenceImageUrl,
            });
            const serverQuestion = mapServerQuestion(created);
            setPapers((current) =>
                current.map((paper) =>
                    paper.id === paperId
                        ? {
                            ...paper,
                            questions: [serverQuestion, ...paper.questions],
                            updatedAt: new Date().toISOString(),
                        }
                        : paper
                )
            );
            return serverQuestion;
        } catch (error) {
            console.error("Failed to create question:", error);
            throw error;
        }
    };

    const updateQuestion = async (paperId: string, questionId: string, update: QuestionInput) => {
        await updateQuestionApi({
            questionId,
            type: update.type,
            prompt: update.prompt,
            answer: update.answer ?? "",
            referenceImageUrl: update.referenceImageUrl,
        });

        setPapers((current) =>
            current.map((paper) =>
                paper.id === paperId
                    ? {
                        ...paper,
                        questions: paper.questions.map((question) =>
                            question.id === questionId
                                ? {
                                    ...question,
                                    type: update.type,
                                    prompt: update.prompt,
                                    answer: update.answer ?? question.answer,
                                    referenceImageUrl:
                                        update.referenceImageUrl === undefined
                                            ? question.referenceImageUrl
                                            : update.referenceImageUrl ?? undefined,
                                }
                                : question
                        ),
                        updatedAt: new Date().toISOString(),
                    }
                    : paper
            )
        );
    };

    const updateQuestionNoteId = (paperId: string, questionId: string, noteId: string) => {
        setPapers((current) =>
            current.map((paper) =>
                paper.id === paperId
                    ? {
                        ...paper,
                        questions: paper.questions.map((question) =>
                            question.id === questionId
                                ? { ...question, noteId }
                                : question
                        ),
                        updatedAt: new Date().toISOString(),
                    }
                    : paper
            )
        );
    };

    const updateQuestionSessionId = (paperId: string, questionId: string, sessionId: string) => {
        setPapers((current) =>
            current.map((paper) =>
                paper.id === paperId
                    ? {
                        ...paper,
                        questions: paper.questions.map((question) =>
                            question.id === questionId
                                ? { ...question, sessionId }
                                : question
                        ),
                        updatedAt: new Date().toISOString(),
                    }
                    : paper
            )
        );
    };

    const deleteQuestion = async (paperId: string, questionId: string) => {
        await deleteQuestionApi(questionId);
        setPapers((current) =>
            current.map((paper) =>
                paper.id === paperId
                    ? {
                        ...paper,
                        questions: paper.questions.filter(
                            (question) => question.id !== questionId
                        ),
                        updatedAt: new Date().toISOString(),
                    }
                    : paper
            )
        );
    };

    const getPaperById = (id: string) => papers.find((paper) => paper.id === id);

    const syncPaperById = async (id: string): Promise<Paper> => {
        const detail = await getPaperDetail(id);
        const remotePaper = mapServerPaperDetail(detail);
        let mergedPaper = remotePaper;
        setPapers((current) => {
            const exists = current.some((p) => p.id === id);
            if (exists) {
                return current.map((p) => {
                    if (p.id !== id) return p;
                    mergedPaper = {
                        ...remotePaper,
                        // preserve local-only question fields (e.g. noteId)
                        questions: remotePaper.questions.map((rq) => {
                            const local = p.questions.find((lq) => lq.id === rq.id);
                            return local ? { ...rq, noteId: local.noteId } : rq;
                        }),
                    };
                    return mergedPaper;
                });
            }
            return [remotePaper, ...current];
        });
        return mergedPaper;
    };

    const saveGradingResult = async (paperId: string, result: SaveGradingResultInput) => {
        const questionResultById = new Map(
            result.questionResults.map((item) => [item.questionId, item])
        );
        const paperGradingResult: GradingResult = {
            totalScore: result.totalScore,
            maxTotalScore: result.maxTotalScore,
            overallComment: result.overallComment,
        };

        try {
            const questionUploads = result.questionResults
                .map((item) =>
                    uploadQuestionGradingResult({
                        questionId: item.questionId,
                        comment: item.comment,
                        score: item.score,
                        maxScore: item.maxScore,
                        isCorrect: item.isCorrect,
                    })
                );

            await Promise.all(questionUploads);

            await uploadPaperGradingResult({
                paperId,
                comment: result.overallComment,
                score: result.totalScore,
                maxScore: result.maxTotalScore,
            });
        } catch (error) {
            console.error("Failed to upload grading results:", error);
            throw error;
        }

        setPapers((current) =>
            current.map((paper) =>
                paper.id === paperId
                    ? {
                        ...paper,
                        gradingResult: paperGradingResult,
                        questions: paper.questions.map((question) => {
                            const questionResult = questionResultById.get(question.id);
                            if (!questionResult) {
                                return question;
                            }

                            return {
                                ...question,
                                gradingResult: {
                                    score: questionResult.score,
                                    maxScore: questionResult.maxScore,
                                    comment: questionResult.comment,
                                    isCorrect: questionResult.isCorrect,
                                },
                            };
                        }),
                        updatedAt: new Date().toISOString(),
                    }
                    : paper
            )
        );
    };

    const addQuestionsFromImport = async (paperId: string, inputs: ImportQuestionInput[]) => {
        if (inputs.length === 0) {
            return false;
        }

        try {
            let createdQuestions = [];
            for (const input of inputs) {
                const question = await createQuestion({
                    paperId,
                    type: input.type,
                    prompt: input.prompt,
                    answer: input.answer ?? "",
                    referenceImageUrl: input.referenceImageUrl,
                });
                createdQuestions.push(question);
            }

            const mappedQuestions = createdQuestions.map((question) =>
                mapServerQuestion(question)
            );

            setPapers((current) =>
                current.map((paper) =>
                    paper.id === paperId
                        ? {
                            ...paper,
                            questions: [...mappedQuestions, ...paper.questions],
                            updatedAt: new Date().toISOString(),
                        }
                        : paper
                )
            );
            return true;
        } catch (error) {
            console.error("Failed to import questions:", error);
            return false;
        }
    };

    const value: PapersContextValue = {
        papers,
        syncPapersFromServer,
        addPaper,
        updatePaper,
        addQuestion,
        updateQuestion,
        updateQuestionNoteId,
        updateQuestionSessionId,
        deleteQuestion,
        getPaperById,
        syncPaperById,
        addQuestionsFromImport,
        saveGradingResult,
    };

    return <PapersContext.Provider value={value}>{children}</PapersContext.Provider>;
}

export function usePapers() {
    const context = useContext(PapersContext);
    if (!context) {
        throw new Error("usePapers must be used within PapersProvider");
    }
    return context;
}

type QuestionInput = {
    type: QuestionType;
    prompt: string;
    answer?: string;
    referenceImageUrl?: string | null;
};

type ImportQuestionInput = {
    type: QuestionType;
    prompt: string;
    answer?: string;
    referenceImageUrl?: string | null;
};

export type {
    Paper,
    Question,
    QuestionType,
    ImportQuestionInput,
    GradingResult,
    QuestionGradingResult,
};
