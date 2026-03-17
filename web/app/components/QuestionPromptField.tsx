"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "primereact/button";
import { InputTextarea } from "primereact/inputtextarea";
import { useToast } from "../toast-context";
import { performQuestionOcr } from "../lib/ocr";
import OcrPreviewModal from "./OcrPreviewModal";

type QuestionPromptFieldProps = {
    value: string;
    onChange: (value: string) => void;
    isDialogOpen: boolean;
};

export default function QuestionPromptField({
    value,
    onChange,

}: QuestionPromptFieldProps) {
    const { showError } = useToast();
    const ocrInputRef = useRef<HTMLInputElement>(null);
    const [isOcring, setIsOcring] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [pendingOcrFile, setPendingOcrFile] = useState<File | null>(null);

    const clearPreviewState = () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(null);
        setPendingOcrFile(null);
        setIsPreviewOpen(false);
    };



    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const handleOcrClick = () => {
        if (isOcring) {
            return;
        }
        ocrInputRef.current?.click();
    };

    const handleOcrChange = (event: React.ChangeEvent<HTMLInputElement>) => {
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
            const q = await performQuestionOcr(fileForOcr);
            const nextValue = value.trim() ? `${value}\n${q.content}` : q.content;
            onChange(nextValue);
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
            <label className="mb-2 block text-sm text-[var(--foreground)]">题目内容</label>
            <div className="flex items-start gap-2">
                <InputTextarea
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    className="flex-1"
                    rows={4}
                />
                <div className="flex flex-col">
                    <Button
                        label="+"
                        outlined
                        severity="secondary"
                        onClick={handleOcrClick}
                        disabled={isOcring}
                        aria-label="OCR 识别并插入题目"
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
        </div>
    );
}