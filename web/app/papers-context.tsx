"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Paper = {
    id: string;
    title: string;
    description: string;
    updatedAt: string;
    questions: Question[];
};

type QuestionType = "single" | "multiple" | "blank" | "essay";

type Question = {
    id: string;
    type: QuestionType;
    prompt: string;
    answer: string;
};

type PaperInput = {
    title: string;
    description?: string;
};

type PaperUpdate = Partial<Omit<Paper, "id">>;

type PapersContextValue = {
    papers: Paper[];
    addPaper: (input: PaperInput) => Paper;
    updatePaper: (id: string, update: PaperUpdate) => void;
    addQuestion: (paperId: string, input: QuestionInput) => void;
    deleteQuestion: (paperId: string, questionId: string) => void;
    getPaperById: (id: string) => Paper | undefined;
};

const defaultPapers: Paper[] = [
    {
        id: "paper-1",
        title: "高等数学期中试卷",
        description: "重点覆盖极限与导数",
        updatedAt: new Date().toISOString(),
        questions: [
            {
                id: "q-1",
                type: "single",
                prompt: "已知函数 f(x)=x^2-1，则 f(2) 等于多少？",
                answer: "3",
            },
            {
                id: "q-2",
                type: "blank",
                prompt: "求极限：lim_{x→0} (sin x)/x = ____。",
                answer: "1",
            },
        ],
    },
    {
        id: "paper-2",
        title: "线性代数练习卷",
        description: "矩阵运算与特征值专题",
        updatedAt: new Date().toISOString(),
        questions: [
            {
                id: "q-3",
                type: "multiple",
                prompt: "下列哪些矩阵是对称矩阵？",
                answer: "A、C",
            },
            {
                id: "q-4",
                type: "essay",
                prompt: "简述特征值的几何意义。",
                answer: "特征值表示线性变换在特征向量方向上的伸缩倍数。",
            },
        ],
    },
];

const storageKey = "papers";

const PapersContext = createContext<PapersContextValue | null>(null);

export function PapersProvider({ children }: { children: React.ReactNode }) {
    const [papers, setPapers] = useState<Paper[]>(defaultPapers);

    useEffect(() => {
        const stored = window.localStorage.getItem(storageKey);
        if (!stored) {
            return;
        }

        try {
            const parsed = JSON.parse(stored) as Paper[];
            if (Array.isArray(parsed) && parsed.length > 0) {
                setPapers(parsed);
            }
        } catch {
            setPapers(defaultPapers);
        }
    }, []);

    useEffect(() => {
        window.localStorage.setItem(storageKey, JSON.stringify(papers));
    }, [papers]);

    const addPaper = (input: PaperInput) => {
        const newPaper: Paper = {
            id: `paper-${Date.now()}`,
            title: input.title,
            description: input.description ?? "",
            updatedAt: new Date().toISOString(),
            questions: [],
        };
        setPapers((current) => [newPaper, ...current]);
        return newPaper;
    };

    const updatePaper = (id: string, update: PaperUpdate) => {
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

    const addQuestion = (paperId: string, input: QuestionInput) => {
        const newQuestion: Question = {
            id: `q-${Date.now()}`,
            type: input.type,
            prompt: input.prompt,
            answer: input.answer,
        };
        setPapers((current) =>
            current.map((paper) =>
                paper.id === paperId
                    ? {
                        ...paper,
                        questions: [newQuestion, ...paper.questions],
                        updatedAt: new Date().toISOString(),
                    }
                    : paper
            )
        );
    };

    const deleteQuestion = (paperId: string, questionId: string) => {
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

    const value = useMemo(
        () => ({
            papers,
            addPaper,
            updatePaper,
            addQuestion,
            deleteQuestion,
            getPaperById,
        }),
        [papers]
    );

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
    answer: string;
};

export type { Paper, Question, QuestionType };
