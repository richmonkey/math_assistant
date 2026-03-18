"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "primereact/button";
import { AutoCodeLatex } from "../components/AutoLatex";
import MathEditor from "../components/MathEditor";

const TEMPLATES = [

    { label: "二次公式", latex: "x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}" },
    { label: "三角恒等式", latex: "\\sin^2 x+\\cos^2 x=1" },
    { label: "对数换底", latex: "\\log_a b=\\frac{\\ln b}{\\ln a}" },
];

function InsertFormulaPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnUrl = searchParams.get("returnUrl") ?? "";

    const [formulaLatex, setFormulaLatex] = useState("");

    const insertTemplate = (template: string) => {
        setFormulaLatex((prev) => `${prev}${template}`);
    };

    const handleCancel = () => {
        router.back();
    };

    const handleConfirm = () => {
        const trimmed = formulaLatex.trim();
        if (!trimmed || !returnUrl) {
            router.back();
            return;
        }
        const separator = returnUrl.includes("?") ? "&" : "?";
        router.push(`${returnUrl}${separator}formula=${encodeURIComponent(trimmed)}`);
    };

    return (
        <div className="flex min-h-screen flex-col bg-[var(--background)]">
            <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-6">
                <div className="mb-2 flex items-center gap-3">
                    <Button icon="pi pi-arrow-left" text onClick={handleCancel} aria-label="返回" />
                    <h1 className="text-xl font-semibold">插入数学公式</h1>
                </div>
                <div>
                    <p className="mb-2 text-sm text-[var(--muted)]">常用模板</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {TEMPLATES.map((t) => (
                            <Button
                                key={t.label}
                                type="button"
                                label={t.label}
                                outlined
                                size="small"
                                onClick={() => insertTemplate(t.latex)}
                            />
                        ))}
                    </div>
                </div>

                <div className="rounded border border-[var(--surface-border)] bg-[var(--surface)] p-3">
                    <p className="mb-2 text-xs text-[var(--muted)]">公式编辑器（MathLive）</p>
                    <MathEditor
                        value={formulaLatex}
                        onChange={setFormulaLatex}
                        virtualKeyboardMode="onfocus"
                        className="block min-h-14 w-full rounded border border-[var(--surface-border)] bg-[var(--surface-ground)] px-3 py-2 text-base"
                    />
                </div>

                <div className="rounded border border-[var(--surface-border)] bg-[var(--surface)] p-3">
                    <p className="mb-2 text-xs text-[var(--muted)]">公式预览</p>
                    <AutoCodeLatex className="min-h-10 text-sm" text={formulaLatex || "请输入公式"} />
                </div>

                <div className="flex justify-end gap-2">
                    <Button type="button" label="取消" severity="secondary" outlined onClick={handleCancel} />
                    <Button type="button" label="插入" icon="pi pi-check" onClick={handleConfirm} />
                </div>
            </div>
        </div>
    );
}

export default function InsertFormulaPage() {
    return (
        <Suspense>
            <InsertFormulaPageContent />
        </Suspense>
    );
}
