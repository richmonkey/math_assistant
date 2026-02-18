"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { usePapers } from "../../papers-context";
import AutoLatex from "../../components/AutoLatex";

const questionTypeLabels: Record<string, string> = {
    single: "单选题",
    multiple: "多选题",
    blank: "填空题",
    essay: "解答题",
};

type GradingResult = {
    questionId: string;
    score: number;
    maxScore: number;
    comment: string;
    isCorrect: boolean;
};

function GradingPageContent() {
    const searchParams = useSearchParams();
    const paperId = searchParams.get("paperId") ?? "";
    const { getPaperById } = usePapers();
    const paper = useMemo(() => getPaperById(paperId), [getPaperById, paperId]);

    // 模拟批改结果数据，实际应该从后端获取或通过其他方式生成
    const [gradingResults] = useState<GradingResult[]>(() => {
        if (!paper) return [];
        return paper.questions.map((question) => ({
            questionId: question.id,
            score: Math.random() > 0.5 ? 10 : Math.floor(Math.random() * 10),
            maxScore: 10,
            comment: Math.random() > 0.5
                ? "答案正确，解答完整。"
                : "答案有误，请检查计算过程。",
            isCorrect: Math.random() > 0.5,
        }));
    });

    const totalScore = gradingResults.reduce((sum, result) => sum + result.score, 0);
    const maxTotalScore = gradingResults.reduce((sum, result) => sum + result.maxScore, 0);

    return (
        <main className="mx-auto max-w-3xl p-6">
            {!paper ? (
                <>
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                        <h1 className="text-2xl font-semibold">阅卷详情</h1>
                        <Link
                            href={`/papers?paperId=${encodeURIComponent(paperId)}`}
                            className="rounded border border-[var(--surface-border)] px-3 py-2 text-sm transition-colors hover:bg-[var(--hover)]"
                        >
                            返回试卷
                        </Link>
                    </div>
                    <section className="rounded border border-[var(--surface-border)] bg-[var(--surface)] p-4">
                        <p className="text-[var(--muted)]">未找到该试卷，请返回列表。</p>
                    </section>
                </>
            ) : (
                <>
                    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
                        <div className="flex-1">
                            <h1 className="text-2xl font-semibold">{paper.title} - 阅卷详情</h1>
                            <p className="mt-2 text-[var(--muted)]">{paper.description}</p>
                        </div>
                        <Link
                            href={`/papers?paperId=${encodeURIComponent(paperId)}`}
                            className="rounded border border-[var(--surface-border)] px-3 py-2 text-sm transition-colors hover:bg-[var(--hover)]"
                        >
                            返回试卷
                        </Link>
                    </div>

                    {/* 总分统计 */}
                    <section className="mb-6 rounded border border-[var(--surface-border)] bg-[var(--surface)] p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold">总分统计</h2>
                                <p className="mt-1 text-sm text-[var(--muted)]">
                                    共 {paper.questions.length} 题
                                </p>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-bold">
                                    {totalScore} / {maxTotalScore}
                                </div>
                                <div className="mt-1 text-sm text-[var(--muted)]">
                                    得分率：{maxTotalScore > 0 ? Math.round((totalScore / maxTotalScore) * 100) : 0}%
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 题目批改详情 */}
                    <section className="rounded border border-[var(--surface-border)] bg-[var(--surface)] p-5">
                        <h2 className="mb-4 text-lg font-semibold">批改详情</h2>

                        {paper.questions.length === 0 ? (
                            <p className="text-sm text-[var(--muted)]">暂无题目。</p>
                        ) : (
                            <ul className="space-y-4">
                                {paper.questions.map((question, index) => {
                                    const result = gradingResults.find(r => r.questionId === question.id);
                                    if (!result) return null;

                                    return (
                                        <li
                                            key={question.id}
                                            className="rounded border border-[var(--surface-border)] p-4"
                                        >
                                            <div className="mb-3 flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-3">
                                                    <p className="text-sm text-[var(--muted)]">
                                                        第 {index + 1} 题 · {questionTypeLabels[question.type]}
                                                    </p>
                                                    <span
                                                        className={`rounded px-2 py-1 text-xs font-medium ${result.isCorrect
                                                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                                            }`}
                                                    >
                                                        {result.isCorrect ? "正确" : "错误"}
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-lg font-semibold">
                                                        {result.score} / {result.maxScore}
                                                    </div>
                                                </div>
                                            </div>

                                            <AutoLatex
                                                className="mb-3 font-medium"
                                                text={question.prompt}
                                            />

                                            <div className="mb-3 rounded bg-[var(--hover)] p-3">
                                                <p className="mb-1 text-sm font-medium text-[var(--muted)]">
                                                    标准答案：
                                                </p>
                                                <AutoLatex
                                                    className="text-sm"
                                                    text={question.answer}
                                                />
                                            </div>

                                            <div className="rounded border border-[var(--surface-border)] bg-[var(--surface)] p-3">
                                                <p className="mb-1 text-sm font-medium text-[var(--muted)]">
                                                    批改意见：
                                                </p>
                                                <p className="text-sm">{result.comment}</p>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </section>

                    {/* 整体评语 */}
                    <section className="mt-6 rounded border border-[var(--surface-border)] bg-[var(--surface)] p-5">
                        <h2 className="mb-3 text-lg font-semibold">整体评语</h2>
                        <div className="rounded bg-[var(--hover)] p-4">
                            <p className="text-sm leading-relaxed">
                                {maxTotalScore > 0 ? (
                                    (() => {
                                        const scoreRate = (totalScore / maxTotalScore) * 100;
                                        if (scoreRate >= 90) {
                                            return "本次测验表现优异！您对知识点的掌握非常扎实，答题思路清晰，解题步骤规范。继续保持这种学习态度，争取在更有挑战性的题目中有所突破。";
                                        } else if (scoreRate >= 75) {
                                            return "本次测验表现良好。基础知识掌握较为扎实，但在部分题目的解答上还有提升空间。建议针对错题进行专项复习，强化薄弱环节，争取下次取得更好的成绩。";
                                        } else if (scoreRate >= 60) {
                                            return "本次测验基本达到及格水平。您已经掌握了部分基础知识，但在理解深度和应用能力上还需要加强。建议系统复习相关章节，多做练习题，巩固基础知识点。";
                                        } else {
                                            return "本次测验成绩不太理想，需要引起重视。建议您认真回顾课堂内容，梳理基础知识点，可以寻求老师或同学的帮助。学习是一个循序渐进的过程，不要气馁，加强练习一定会有所进步。";
                                        }
                                    })()
                                ) : (
                                    "暂无评语。"
                                )}
                            </p>
                        </div>
                    </section>
                </>
            )}


        </main>
    );
}

export default function GradingPage() {
    return (
        <Suspense fallback={<main className="mx-auto max-w-3xl p-6" />}>
            <GradingPageContent />
        </Suspense>
    );
}
