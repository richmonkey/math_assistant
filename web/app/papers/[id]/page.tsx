"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "primereact/button";
import { ProgressSpinner } from "primereact/progressspinner";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { usePapers } from "../../papers-context";
import NewQuestionDialog from "../../components/NewQuestionDialog";
import EditQuestionDialog from "../../components/EditQuestionDialog";
import { useToast } from "../../toast-context";
import ollama from 'ollama/browser'

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

type PaperQuestion = {
    number: string;
    type: "multiple_choice" | "fill_blank" | "calculation" | "proof" | "unknown";
    content: string;
    options: { label: string; text: string }[];
};

async function load_paper_image(img: File): Promise<PaperQuestion[]> {
    const prompt = `You are a professional OCR system specialized in high school mathematics exams.

Your task is to extract ONLY printed content from the provided exam image and convert it into structured JSON.

STRICT RULES:

1. Extract only printed text. Ignore ALL handwritten answers, scribbles, corrections, underlines, marks, or stamps.
2. Preserve question numbering exactly as shown.
3. Convert all mathematical expressions into standard LaTeX format.
   - Use $...$ for inline formulas
   - Use $$...$$ for displayed equations
4. Do NOT summarize.
5. Do NOT explain.
6. Do NOT guess missing parts.
7. Do NOT repeat any content.
8. If a question is incomplete or unclear, extract only the visible part.
9. When the page ends, STOP immediately.
10. Output VALID JSON only. No extra text before or after JSON.

JSON FORMAT:

{
  "page": 1,
  "exam_title": "",
  "questions": [
    {
      "number": "",
      "type": "multiple_choice | fill_blank | calculation | proof | unknown",
      "content": "",
      "options": [
        {"label": "A", "text": ""},
        {"label": "B", "text": ""},
        {"label": "C", "text": ""},
        {"label": "D", "text": ""}
      ]
    }
  ]
}

Additional rules:
- If the exam title is visible, extract it. Otherwise leave it empty.
- If a question has no options, set "options": [].
- Keep line breaks inside content using \n.
- Ensure the output is strictly valid JSON.

Return JSON only.`

    //读取file对象，得到Uint8Array格式的图片数据
    const arrayBuffer = await img.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    console.log("Loaded image as Uint8Array:", uint8Array);

    let encodedImage = await ollama.encodeImage(uint8Array);
    const response = await ollama.chat({
        model: 'qwen3-vl:8b-instruct',
        messages: [{
            role: 'user',
            content: prompt,
            images: [encodedImage],
        }],
    })
    console.log(response.message.content);
    let obj = JSON.parse(response.message.content) // validate JSON
    console.log("Extracted JSON:", obj);
    //返回题目list对象
    return obj.questions;
}

export default function PaperDetailPage() {
    const params = useParams<{ id: string }>();
    const paperId = params?.id ?? "";
    const { getPaperById, updatePaper, deleteQuestion } = usePapers();
    const paper = useMemo(() => getPaperById(paperId), [getPaperById, paperId]);
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [isTitleEditing, setIsTitleEditing] = useState(false);
    const [isDescriptionEditing, setIsDescriptionEditing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const importInputRef = useRef<HTMLInputElement>(null);
    const { showError } = useToast();

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

    const handleImportClick = () => {
        importInputRef.current?.click();
    };

    const handleImportChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files?.length) {
            return;
        }
        if (!event.target.files[0]) {
            return;
        }
        let file = event.target.files[0];

        event.target.value = "";

        try {
            setIsImporting(true);
            const questions = await load_paper_image(file);
            console.log("Imported questions:", questions);
            if (paperId) {
                sessionStorage.setItem(
                    `import-preview-${paperId}`,
                    JSON.stringify({ questions })
                );
                router.push(`/papers/${paperId}/import-preview`);
            } else {
                showError("未能识别试卷编号，请返回列表后重试。", "导入失败");
            }
        } catch (error) {
            console.error("Failed to import paper:", error);
            showError("请确保上传的是清晰的试卷图片，并且图片中仅包含打印内容。", "导入失败");
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <main className="mx-auto max-w-3xl p-6">
            {isImporting && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="rounded-lg bg-[var(--surface)] p-6 text-center shadow-lg">
                        <ProgressSpinner />
                        <p className="mt-3 text-sm text-[var(--muted)]">正在处理，请稍候...</p>
                    </div>
                </div>
            )}
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
                            <div className="flex items-center gap-2">
                                <input
                                    ref={importInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImportChange}
                                    className="hidden"
                                />
                                <Button
                                    label="导入试卷"
                                    icon="pi pi-upload"
                                    outlined
                                    onClick={handleImportClick}
                                />
                                <NewQuestionDialog paperId={paper.id} />
                            </div>
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
