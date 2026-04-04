"use client";

import { useRef, useState } from "react";
import { Button } from "primereact/button";

import { uploadQuestionReferenceImage } from "../lib/papers-api";


type ReferenceImageFieldProps = {
    value?: string | null;
    onChange: (value: string | null) => void;
};


export default function ReferenceImageField({
    value,
    onChange,
}: ReferenceImageFieldProps) {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [uploadError, setUploadError] = useState("");
    const [isUploading, setIsUploading] = useState(false);

    const handlePickImage = () => {
        fileInputRef.current?.click();
    };

    const handleRemoveImage = () => {
        onChange(null);
        setUploadError("");
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleFileChange = async (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        setUploadError("");
        setIsUploading(true);
        try {
            const uploaded = await uploadQuestionReferenceImage(file);
            onChange(uploaded.url);
        } catch (error) {
            console.error("Failed to upload reference image:", error);
            setUploadError("上传参考图片失败，请稍后重试");
        } finally {
            setIsUploading(false);
            event.target.value = "";
        }
    };

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
                <label className="block text-sm text-[var(--foreground)]">
                    题目参考图片
                </label>
                <div className="flex gap-2">
                    <Button
                        type="button"
                        label={value ? "重新上传" : "上传图片"}
                        icon="pi pi-upload"
                        outlined
                        loading={isUploading}
                        onClick={handlePickImage}
                    />
                    {value && (
                        <Button
                            type="button"
                            label="移除"
                            icon="pi pi-trash"
                            severity="secondary"
                            outlined
                            onClick={handleRemoveImage}
                        />
                    )}
                </div>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
            />

            {value ? (
                <div className="flex justify-center overflow-hidden rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] p-2">
                    <img
                        src={value}
                        alt="题目参考图片"
                        className="max-h-80 max-w-full object-scale-down"
                    />
                 
                </div>
            ) : (
                <div className="rounded-lg border border-dashed border-[var(--surface-border)] bg-[var(--surface)] px-4 py-6 text-sm text-[var(--muted)]">
                    上传后可将题目配图保存为参考图片，便于后续查看和编辑。
                </div>
            )}

            {uploadError && <p className="text-sm text-red-400">{uploadError}</p>}
        </div>
    );
}