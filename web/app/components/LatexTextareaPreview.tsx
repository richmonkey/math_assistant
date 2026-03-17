"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "primereact/button";
import { InputTextarea } from "primereact/inputtextarea";
import { AutoCodeLatex } from "./AutoLatex";

type LatexTextareaPreviewProps = {
    value: string;
    onChange: (value: string) => void;
    rows?: number;
    className?: string;
    placeholder?: string;
};

const SYMBOL_OPTIONS = [
    { label: "√", value: "\\sqrt{x}" },
    { label: "∛", value: "\\sqrt[n]{x}" },
    { label: "x²", value: "x^n" },
    { label: "x₂", value: "x_n" },
    { label: "x₂²", value: "x_a^b" },
    { label: "÷", value: "\\frac{a}{b}" },
    { label: "limit", value: "\\lim_{x \\to 0}" },
    { label: "∑", value: "\\sum_{a}^{b}" },
    { label: "∏", value: "\\prod_{a}^{b}" },
    { label: "( )", value: "\\left( \\right)" },
    { label: "[ ]", value: "\\left[ \\right]" },
    { label: "{ }", value: "\\left\\{ \\right\\}" },
    { label: "⋃", value: "\\bigcup_{\\alpha\\in S}" },
    { label: "⋂", value: "\\bigcap_{\\alpha\\in S}" },
    { label: "∂", value: "\\partial" },
    { label: "∞", value: "\\infty" },
    { label: "∴", value: "\\therefore" },
    // { label: "binom", value: "\\binom{n}{k}" },
    // { label: "∫", value: "\\int_{a}^{b}" },
    // { label: "∮", value: "\\oint_{a}^{b}" },
    // { label: "⌈ x ⌉", value: "\\lceil x \\rceil" },
    // { label: "⌊ x ⌋", value: "\\lfloor x \\rfloor" },
];

const GREEK_OPTIONS = [
    { label: "ɑ", value: "\\alpha" },
    { label: "β", value: "\\beta" },
    { label: "ɣ", value: "\\gamma" },
    { label: "δ", value: "\\delta" },
    { label: "ϵ", value: "\\epsilon" },
    { label: "ε", value: "\\varepsilon" },
    { label: "ζ", value: "\\zeta" },
    { label: "η", value: "\\eta" },
    { label: "θ", value: "\\theta" },
    { label: "ϑ", value: "\\vartheta" },
    { label: "ι", value: "\\iota" },
    { label: "κ", value: "\\kappa" },
    { label: "λ", value: "\\lambda" },
    { label: "μ", value: "\\mu" },
    { label: "ν", value: "\\nu" },
    { label: "ξ", value: "\\xi" },
    { label: "π", value: "\\pi" },
    { label: "ϖ", value: "\\varpi" },
    { label: "ρ", value: "\\rho" },
    { label: "ϱ", value: "\\varrho" },
    { label: "σ", value: "\\sigma" },
    { label: "ς", value: "\\varsigma" },
    { label: "τ", value: "\\tau" },
    { label: "υ", value: "\\upsilon" },
    { label: "ϕ", value: "\\phi" },
    { label: "φ", value: "\\varphi" },
    { label: "χ", value: "\\chi" },
    { label: "ψ", value: "\\psi" },
    { label: "ω", value: "\\omega" },
    { label: "Ɣ", value: "\\Gamma" },
    { label: "Δ", value: "\\Delta" },
    { label: "Θ", value: "\\Theta" },
    { label: "Λ", value: "\\Lambda" },
    { label: "Ξ", value: "\\Xi" },
    { label: "Π", value: "\\Pi" },
    { label: "Σ", value: "\\Sigma" },
    { label: "Υ", value: "\\Upsilon" },
    { label: "Ψ", value: "\\Psi" },
    { label: "Ω", value: "\\Omega" },
];

export default function LatexTextareaPreview({
    value,
    onChange,
    rows = 3,
    className,
    placeholder,
}: LatexTextareaPreviewProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const containerRef = useRef<HTMLDivElement>(null);
    const undoStackRef = useRef<string[]>([]);
    const redoStackRef = useRef<string[]>([]);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const [selectedSymbol, setSelectedSymbol] = useState("");
    const [selectedGreek, setSelectedGreek] = useState("");

    const syncHistoryButtons = useCallback(() => {
        setCanUndo(undoStackRef.current.length > 0);
        setCanRedo(redoStackRef.current.length > 0);
    }, []);

    const applyValue = useCallback(
        (nextValue: string, trackHistory = true) => {
            if (nextValue === value) return;

            if (trackHistory) {
                undoStackRef.current.push(value);
                redoStackRef.current = [];
            }

            onChange(nextValue);
            syncHistoryButtons();
        },
        [onChange, syncHistoryButtons, value],
    );

    const getTextarea = useCallback(() => {
        return containerRef.current?.querySelector("textarea") ?? null;
    }, []);

    const insertAtCursor = useCallback(
        (token: string) => {
            const textarea = getTextarea();
            if (!textarea) {
                applyValue(value ? `${value} ${token}` : token);
                return;
            }

            const start = textarea.selectionStart ?? value.length;
            const end = textarea.selectionEnd ?? value.length;
            const nextValue = `${value.slice(0, start)}${token}${value.slice(end)}`;
            const nextCursor = start + token.length;

            applyValue(nextValue);

            requestAnimationFrame(() => {
                const latestTextarea = getTextarea();
                if (!latestTextarea) return;
                latestTextarea.focus();
                latestTextarea.setSelectionRange(nextCursor, nextCursor);
            });
        },
        [applyValue, getTextarea, value],
    );

    const undo = useCallback(() => {
        const previous = undoStackRef.current.pop();
        if (previous === undefined) return;

        redoStackRef.current.push(value);
        onChange(previous);
        syncHistoryButtons();
    }, [onChange, syncHistoryButtons, value]);

    const redo = useCallback(() => {
        const next = redoStackRef.current.pop();
        if (next === undefined) return;

        undoStackRef.current.push(value);
        onChange(next);
        syncHistoryButtons();
    }, [onChange, syncHistoryButtons, value]);

    // When returning from the insert-formula page, pick up the formula param
    useEffect(() => {
        const formula = searchParams.get("formula");
        if (!formula) return;

        const formulaText = `$${formula}$`;
        applyValue(value ? `${value}\n${formulaText}` : formulaText);

        // Remove the formula param from the URL without re-navigating
        const next = new URLSearchParams(searchParams.toString());
        next.delete("formula");
        const newUrl = next.size > 0 ? `${pathname}?${next.toString()}` : pathname;
        router.replace(newUrl);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    useEffect(() => {
        syncHistoryButtons();
    }, [syncHistoryButtons]);

    const openFormulaPage = () => {
        const returnUrl = `${pathname}${searchParams.size > 0 ? `?${searchParams.toString()}` : ""}`;
        router.push(`/insert-formula?returnUrl=${encodeURIComponent(returnUrl)}`);
    };

    return (
        <div className={`flex-1 ${className ?? ""}`} ref={containerRef}>
            <div className="mb-2 flex flex-wrap items-center gap-2">
                <Button
                    type="button"
                    label="撤销"
                    icon="pi pi-undo"
                    outlined
                    size="small"
                    disabled={!canUndo}
                    onClick={undo}
                />
                <Button
                    type="button"
                    label="重做"
                    icon="pi pi-refresh"
                    outlined
                    size="small"
                    disabled={!canRedo}
                    onClick={redo}
                />
                <select
                    value={selectedSymbol}
                    onChange={(event) => {
                        const nextValue = event.target.value;
                        setSelectedSymbol("");
                        if (!nextValue) return;
                        insertAtCursor(`${nextValue} `);
                    }}
                    className="h-8 rounded border border-[var(--surface-border)] bg-[var(--surface)] px-2 text-xs"
                >
                    <option value="">Symbols</option>
                    {SYMBOL_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <select
                    value={selectedGreek}
                    onChange={(event) => {
                        const nextValue = event.target.value;
                        setSelectedGreek("");
                        if (!nextValue) return;
                        insertAtCursor(`${nextValue} `);
                    }}
                    className="h-8 rounded border border-[var(--surface-border)] bg-[var(--surface)] px-2 text-xs"
                >
                    <option value="">Greek</option>
                    {GREEK_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>
            <InputTextarea
                value={value}
                onChange={(event) => applyValue(event.target.value)}
                className="w-full"
                rows={rows}
                placeholder={placeholder}
            />
            <div className="mt-2 flex justify-end">
                <Button
                    type="button"
                    label="插入公式"
                    icon="pi pi-calculator"
                    outlined
                    size="small"
                    onClick={openFormulaPage}
                />
            </div>
            <div className="mt-2 rounded border border-[var(--surface-border)] bg-[var(--surface)] p-3">
                <p className="mb-2 text-xs text-[var(--muted)]">LaTeX 预览</p>
                <AutoCodeLatex className="min-h-8 text-sm" text={value || "请输入内容以预览"} />
            </div>
        </div>
    );
}
