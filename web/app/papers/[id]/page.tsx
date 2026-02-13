"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { usePapers } from "../../papers-context";

const questionTypeLabels: Record<string, string> = {
    single: "单选题",
    multiple: "多选题",
    blank: "填空题",
    essay: "问答题",
};

export default function PaperDetailPage() {
    const params = useParams<{ id: string }>();
    const paperId = params?.id ?? "";
    const { getPaperById, updatePaper, addQuestion, deleteQuestion } = usePapers();
    const paper = useMemo(() => getPaperById(paperId), [getPaperById, paperId]);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState("");
    const [newType, setNewType] = useState("single");
    const [newPrompt, setNewPrompt] = useState("");
    const [newAnswer, setNewAnswer] = useState("");
    const [questionError, setQuestionError] = useState("");

    useEffect(() => {
        if (!paper) {
            return;
        }
        setTitle(paper.title);
        setDescription(paper.description);
        console.log("pppp:", paper, "questions:", paper.questions);
    }, [paper]);

    const handleSave = () => {
        if (!paper) {
            return;
        }
        updatePaper(paper.id, {
            title,
            description,
        });
        setStatus("已保存");
        window.setTimeout(() => setStatus(""), 2000);
    };

    const handleAddQuestion = () => {
        if (!paper) {
            return;
        }
        if (!newPrompt.trim() || !newAnswer.trim()) {
            setQuestionError("请填写题目内容和答案");
            return;
        }
        addQuestion(paper.id, {
            type: newType as "single" | "multiple" | "blank" | "essay",
            prompt: newPrompt.trim(),
            answer: newAnswer.trim(),
        });
        setNewPrompt("");
        setNewAnswer("");
        setQuestionError("");
    };

    return (
        <main className="mx-auto max-w-3xl p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold">试卷详情</h1>
                    <p className="text-[var(--muted)]">查看并修改试卷信息</p>
                </div>
                <Link
                    href="/"
                    className="rounded border border-[var(--surface-border)] px-3 py-2 text-sm transition-colors hover:bg-[var(--hover)]"
                >
                    返回列表
                </Link>
            </div>

            {!paper ? (
                <section className="rounded border border-[var(--surface-border)] bg-[var(--surface)] p-4">
                    <p className="text-[var(--muted)]">未找到该试卷，请返回列表。</p>
                </section>
            ) : (
                <section className="rounded border border-[var(--surface-border)] bg-[var(--surface)] p-5">
                    <div className="mb-4">
                        <label className="mb-2 block text-sm">试卷名称</label>
                        <InputText
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            className="w-full"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="mb-2 block text-sm">试卷说明</label>
                        <InputTextarea
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                            className="w-full"
                            rows={4}
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <Button label="保存修改" icon="pi pi-save" onClick={handleSave} />
                        {status && <span className="text-sm text-[var(--muted)]">{status}</span>}
                    </div>

                    <div className="my-6 h-px bg-[var(--surface-border)]" />

                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-lg font-semibold">题目列表</h2>
                        <span className="text-sm text-[var(--muted)]">共 {paper.questions.length} 题</span>
                    </div>

                    {paper.questions.length === 0 ? (
                        <p className="mb-4 text-sm text-[var(--muted)]">暂无题目，请添加新的题目。</p>
                    ) : (
                        <ul className="mb-6 space-y-3">
                            {paper.questions.map((question, index) => (
                                <li
                                    key={question.id}
                                    className="rounded border border-[var(--surface-border)] p-4"
                                >
                                    <div className="mb-2 flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-sm text-[var(--muted)]">
                                                第 {index + 1} 题 · {questionTypeLabels[question.type]}
                                            </p>
                                            <p className="mt-1 font-medium">{question.prompt}</p>
                                        </div>
                                        <Button
                                            label="删除"
                                            icon="pi pi-trash"
                                            severity="danger"
                                            outlined
                                            onClick={() => deleteQuestion(paper.id, question.id)}
                                        />
                                    </div>
                                    <div className="rounded bg-[var(--hover)] p-3 text-sm">
                                        答案：{question.answer}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}

                    <div className="rounded border border-[var(--surface-border)] p-4">
                        <h3 className="mb-3 text-base font-semibold">新增题目</h3>
                        <div className="mb-3">
                            <label className="mb-2 block text-sm">题型</label>
                            <select
                                value={newType}
                                onChange={(event) => setNewType(event.target.value)}
                                className="w-full rounded border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-2 text-sm"
                            >
                                <option value="single">单选题</option>
                                <option value="multiple">多选题</option>
                                <option value="blank">填空题</option>
                                <option value="essay">问答题</option>
                            </select>
                        </div>
                        <div className="mb-3">
                            <label className="mb-2 block text-sm">题目内容</label>
                            <InputTextarea
                                value={newPrompt}
                                onChange={(event) => setNewPrompt(event.target.value)}
                                className="w-full"
                                rows={3}
                            />
                        </div>
                        <div className="mb-3">
                            <label className="mb-2 block text-sm">答案</label>
                            <InputTextarea
                                value={newAnswer}
                                onChange={(event) => setNewAnswer(event.target.value)}
                                className="w-full"
                                rows={2}
                            />
                        </div>
                        {questionError && (
                            <p className="mb-3 text-sm text-red-400">{questionError}</p>
                        )}
                        <Button label="添加题目" icon="pi pi-plus" onClick={handleAddQuestion} />
                    </div>
                </section>
            )}
        </main>
    );
}
