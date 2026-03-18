"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { GradingResult, usePapers } from "../../papers-context";
import AutoLatex from "../../components/AutoLatex";
import { QuestionData, QuestionGradingResult, gradeQuestion, generateOverallComment } from "../../lib/grading";

const questionTypeLabels: Record<string, string> = {
    single: "单选题",
    multiple: "多选题",
    blank: "填空题",
    judge: "判断题",
    free: "解答题",
};

type ComputedPaperGradingResult = GradingResult & {
    questionResults: QuestionGradingResult[];
};


function GradingPageContent() {
    const searchParams = useSearchParams();
    const paperId = searchParams.get("paperId") ?? "";
    const { getPaperById, saveGradingResult } = usePapers();
    const paper = useMemo(() => getPaperById(paperId), [getPaperById, paperId]);

    const [paperGradingResult, setPaperGradingResult] = useState<GradingResult>({ totalScore: 0, maxTotalScore: 0, overallComment: "" });
    const [isGrading, setIsGrading] = useState(false);
    const [currentGradingIndex, setCurrentGradingIndex] = useState(-1);

    const totalScore = paperGradingResult.totalScore;
    const maxTotalScore = paperGradingResult.maxTotalScore;
    const overallComment = paperGradingResult.overallComment;


    /**
     * 对整张试卷进行 AI 批改
     * @param questions 题目列表
     * @param maxScorePerQuestion 每题满分（默认10分）
     */
    async function gradePaper(
        questions: QuestionData[],
        maxScorePerQuestion: number = 10
    ): Promise<ComputedPaperGradingResult> {
        // 步骤1：批改每道题
        const questionResults: QuestionGradingResult[] = [];

        for (let i = 0; i < questions.length; i++) {
            const question = questions[i];

            // 更新当前批改进度
            setCurrentGradingIndex(i);

            const result = await gradeQuestion(question, maxScorePerQuestion);
            questionResults.push(result);
        }

        // 计算总分
        const totalScore = questionResults.reduce((sum, r) => sum + r.score, 0);
        const maxTotalScore = questionResults.reduce((sum, r) => sum + r.maxScore, 0);

        // 步骤2：生成整体评语
        const overallComment = await generateOverallComment(
            questionResults,
            totalScore,
            maxTotalScore
        );

        return {
            totalScore,
            maxTotalScore,
            overallComment,
            questionResults,
        };
    }


    const performGrading = async () => {
        if (!paper) {
            return;
        }

        setIsGrading(true);
        setCurrentGradingIndex(0);

        try {
            const result = await gradePaper(paper.questions.map(q => ({
                id: q.id,
                type: questionTypeLabels[q.type] ?? "未知题型",
                prompt: q.prompt,
                answer: q.answer,
            })));

            setPaperGradingResult({
                totalScore: result.totalScore,
                maxTotalScore: result.maxTotalScore,
                overallComment: result.overallComment,
            });
            // 保存阅卷结果到 papers context
            await saveGradingResult(paperId, result);
        } catch (error) {
            console.error("Failed to grade paper:", error);
        } finally {
            setIsGrading(false);
            setCurrentGradingIndex(-1);
        }
    };

    useEffect(() => {
        if (!paper) {
            return;
        }

        // 如果已经有阅卷结果，且题目数量一致，直接使用
        if (paper.gradingResult && paper.questions.every((question) => question.gradingResult)) {
            setPaperGradingResult(paper.gradingResult);
            return;
        }

        // 否则进行批改
        performGrading();
    }, [paper, paperId, saveGradingResult]);




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
                        <div className="flex gap-2">
                            {!isGrading && paper.gradingResult && (
                                <button
                                    onClick={performGrading}
                                    className="rounded border border-[var(--surface-border)] bg-[var(--primary-color)] px-3 py-2 text-sm text-white transition-colors hover:opacity-90"
                                >
                                    重新阅卷
                                </button>
                            )}
                            <Link
                                href={`/papers?paperId=${encodeURIComponent(paperId)}`}
                                className="rounded border border-[var(--surface-border)] px-3 py-2 text-sm transition-colors hover:bg-[var(--hover)]"
                            >
                                返回试卷
                            </Link>
                        </div>
                    </div>

                    {/* 阅卷进度 */}
                    {isGrading && (
                        <section className="mb-6 rounded border border-blue-300 bg-blue-50 p-5 dark:border-blue-700 dark:bg-blue-950">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                                        正在阅卷中...
                                    </h2>
                                    <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                                        正在批改第 {currentGradingIndex + 1} / {paper.questions.length} 题
                                    </p>
                                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-blue-200 dark:bg-blue-900">
                                        <div
                                            className="h-full bg-blue-600 transition-all duration-300 dark:bg-blue-400"
                                            style={{ width: `${((currentGradingIndex + 1) / paper.questions.length) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                            {currentGradingIndex >= 0 && currentGradingIndex < paper.questions.length && (
                                <div className="mt-4 rounded border border-blue-200 bg-white p-4 dark:border-blue-800 dark:bg-blue-900">
                                    <p className="mb-2 text-sm font-medium text-blue-700 dark:text-blue-300">
                                        当前题目：第 {currentGradingIndex + 1} 题 · {questionTypeLabels[paper.questions[currentGradingIndex].type]}
                                    </p>
                                    <AutoLatex
                                        className="text-sm text-blue-900 dark:text-blue-100"
                                        text={paper.questions[currentGradingIndex].prompt}
                                    />
                                </div>
                            )}
                        </section>
                    )}

                    {/* 总分统计 */}
                    {!isGrading && (
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
                    )}

                    {/* 题目批改详情 */}
                    {!isGrading && (
                        <section className="rounded border border-[var(--surface-border)] bg-[var(--surface)] p-5">
                            <h2 className="mb-4 text-lg font-semibold">批改详情</h2>

                            {paper.questions.length === 0 ? (
                                <p className="text-sm text-[var(--muted)]">暂无题目。</p>
                            ) : (
                                <ul className="space-y-4">
                                    {paper.questions.map((question, index) => {
                                        const result = question.gradingResult;
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
                                                        答案：
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
                    )}

                    {/* 整体评语 */}
                    {!isGrading && (
                        <section className="mt-6 rounded border border-[var(--surface-border)] bg-[var(--surface)] p-5">
                            <h2 className="mb-3 text-lg font-semibold">整体评语</h2>
                            <div className="rounded bg-[var(--hover)] p-4">
                                <p className="text-sm leading-relaxed">
                                    {overallComment}
                                </p>
                            </div>
                        </section>
                    )}
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
