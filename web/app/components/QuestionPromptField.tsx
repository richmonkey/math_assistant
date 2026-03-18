"use client";

import { performQuestionOcr } from "../lib/ocr-api";
import LatexTextareaPreview from "./LatexTextareaPreview";

type QuestionPromptFieldProps = {
    value: string;
    onChange: (value: string) => void;
    isDialogOpen: boolean;
    autoFocus?: boolean;
};

async function ocrQuestion(file: File): Promise<string> {
    const q = await performQuestionOcr(file);
    return q.content;
}

export default function QuestionPromptField({
    value,
    onChange,
    autoFocus = false,
}: QuestionPromptFieldProps) {
    return (
        <div>
            <label className="mb-2 block text-sm text-[var(--foreground)]">题目内容</label>
            <LatexTextareaPreview
                value={value}
                onChange={onChange}
                rows={6}
                autoFocus={autoFocus}
                performOcr={ocrQuestion}
                showOcrButton
            />
        </div>
    );
}