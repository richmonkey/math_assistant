"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { usePapers } from "../../papers-context";
import NewQuestionDialog from "../../components/NewQuestionDialog";
import EditQuestionDialog from "../../components/EditQuestionDialog";

const questionTypeLabels: Record<string, string> = {
    single: "单选题",
    multiple: "多选题",
    blank: "填空题",
    essay: "解答题",
};

const blankDelimiter = " | ";

const formatAnswer = (type: string, answer: string) => {
    if (type !== "blank") {
        return answer;
    }

    const segments = answer
        .split(blankDelimiter)
        .map((item) => item.trim())
        .filter(Boolean);

    if (!segments.length) {
        return answer;
    }

    return segments
        .map((segment, index) => `答案${index + 1}：${segment}`)
        .join("、");
};

export default function PaperDetailPage() {
    const params = useParams<{ id: string }>();
    const paperId = params?.id ?? "";
    const { getPaperById, updatePaper, deleteQuestion } = usePapers();
    const paper = useMemo(() => getPaperById(paperId), [getPaperById, paperId]);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [isTitleEditing, setIsTitleEditing] = useState(false);
    const [isDescriptionEditing, setIsDescriptionEditing] = useState(false);

    useEffect(() => {
        if (!paper) {
            return;
        }
        setTitle(paper.title);
        setDescription(paper.description);
    }, [paper]);

    const handleTitleBlur = () => {
        setIsTitleEditing(false);
        if (!paper || title === paper.title) {
            return;
        }
        updatePaper(paper.id, { title });
    };

    const handleDescriptionBlur = () => {
        setIsDescriptionEditing(false);
        if (!paper || description === paper.description) {
            return;
        }
        updatePaper(paper.id, { description });
    };

    return (
        <main className="mx-auto max-w-3xl p-6">
            {!paper ? (
                <>
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                        <h1 className="text-2xl font-semibold">试卷详情</h1>
                        <Link
                            href="/"
                            className="rounded border border-[var(--surface-border)] px-3 py-2 text-sm transition-colors hover:bg-[var(--hover)]"
                        >
                            返回列表
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
                            {isTitleEditing ? (
                                <InputText
                                    value={title}
                                    onChange={(event) => setTitle(event.target.value)}
                                    onBlur={handleTitleBlur}
                                    className="w-full text-2xl font-semibold"
                                    autoFocus
                                />
                            ) : (
                                <h1
                                    onDoubleClick={() => setIsTitleEditing(true)}
                                    className="cursor-pointer rounded border border-transparent px-2 py-1 text-2xl font-semibold transition-colors hover:border-[var(--surface-border)]"
                                >
                                    {title || "（双击编辑标题）"}
                                </h1>
                            )}
                            {isDescriptionEditing ? (
                                <InputTextarea
                                    value={description}
                                    onChange={(event) => setDescription(event.target.value)}
                                    onBlur={handleDescriptionBlur}
                                    className="mt-2 w-full"
                                    rows={2}
                                    autoFocus
                                />
                            ) : (
                                <p
                                    onDoubleClick={() => setIsDescriptionEditing(true)}
                                    className="mt-2 cursor-pointer rounded border border-transparent px-2 py-1 text-[var(--muted)] transition-colors hover:border-[var(--surface-border)]"
                                >
                                    {description || "（双击编辑描述）"}
                                </p>
                            )}
                        </div>
                        <Link
                            href="/"
                            className="rounded border border-[var(--surface-border)] px-3 py-2 text-sm transition-colors hover:bg-[var(--hover)]"
                        >
                            返回列表
                        </Link>
                    </div>

                    <section className="rounded border border-[var(--surface-border)] bg-[var(--surface)] p-5">

                        <div className="mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <h2 className="text-lg font-semibold">题目列表</h2>
                                <span className="text-sm text-[var(--muted)]">共 {paper.questions.length} 题</span>
                            </div>
                            <NewQuestionDialog paperId={paper.id} />
                        </div>

                        {paper.questions.length === 0 ? (
                            <p className="mb-4 text-sm text-[var(--muted)]">暂无题目，请添加新的题目。</p>
                        ) : (
                            <ul className="mb-4 space-y-3">
                                {paper.questions.map((question, index) => (
                                    <li
                                        key={question.id}
                                        className="rounded border border-[var(--surface-border)] p-4"
                                    >
                                        <div className="mb-2 flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <p className="text-sm text-[var(--muted)]">
                                                    第 {index + 1} 题 · {questionTypeLabels[question.type]}
                                                </p>
                                                <p className="mt-1 font-medium">{question.prompt}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <EditQuestionDialog paperId={paper.id} question={question} />
                                                <Button
                                                    label="删除"
                                                    icon="pi pi-trash"
                                                    severity="danger"
                                                    outlined
                                                    onClick={() => deleteQuestion(paper.id, question.id)}
                                                />
                                            </div>
                                        </div>
                                        <div className="rounded bg-[var(--hover)] p-3 text-sm">
                                            答案：{formatAnswer(question.type, question.answer)}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </>
            )}
        </main>
    );
}
