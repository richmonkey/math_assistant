"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputTextarea } from "primereact/inputtextarea";
import { useToast } from "../toast-context";

import AutoLatex, { AutoCodeLatex } from "./AutoLatex";
import MathEditor from "./MathEditor";
import OcrPreviewModal from "./OcrPreviewModal";

type LatexTextareaPreviewProps = {
    value: string;
    onChange: (value: string) => void;
    onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement>;
    rows?: number;
    className?: string;
    placeholder?: string;
    autoFocus?: boolean;
    performOcr?: (file: File) => Promise<string>;
    showOcrButton?: boolean;
    footerActions?: React.ReactNode;
};

const SYMBOL_OPTIONS = [
    { label: "√", value: "\\sqrt{x}" },
    { label: "∛", value: "\\sqrt[n]{x}" },
    { label: "x²", value: "x^n" },
    { label: "x₂", value: "x_n" },
    { label: "x₂²", value: "x_a^b" },
    { label: "÷", value: "\\div" },
    { label: "a/b", value: "\\frac{a}{b}" },
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

const TEMPLATES = [
    { label: "二次公式", latex: "x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}" },
    { label: "三角恒等式", latex: "\\sin^2 x+\\cos^2 x=1" },
    { label: "对数换底", latex: "\\log_a b=\\frac{\\ln b}{\\ln a}" },
];

const LATEX_COMMAND_SUGGESTIONS = [
    "\\alpha",
    "\\beta",
    "\\gamma",
    "\\delta",
    "\\epsilon",
    "\\varepsilon",
    "\\theta",
    "\\lambda",
    "\\mu",
    "\\pi",
    "\\rho",
    "\\sigma",
    "\\phi",
    "\\varphi",
    "\\omega",
    "\\Delta",
    "\\Theta",
    "\\Lambda",
    "\\Sigma",
    "\\Omega",
    "\\sqrt",
    "\\frac",
    "\\sum",
    "\\prod",
    "\\lim",
    "\\sin",
    "\\cos",
    "\\tan",
    "\\log",
    "\\ln",
    "\\infty",
    "\\partial",
    "\\therefore",
    "\\because",
    "\\begin{cases}",
    "\\left(",
    "\\right)",
    "\\left[",
    "\\right]",
    "\\left\\{",
    "\\right\\}",
];

function getTextareaCaretPosition(textarea: HTMLTextAreaElement, cursor: number): { top: number; left: number } {
    const safeCursor = Math.max(0, Math.min(cursor, textarea.value.length));
    const computed = window.getComputedStyle(textarea);
    const mirror = document.createElement("div");

    mirror.style.position = "absolute";
    mirror.style.visibility = "hidden";
    mirror.style.pointerEvents = "none";
    mirror.style.whiteSpace = "pre-wrap";
    mirror.style.wordBreak = "break-word";
    mirror.style.overflowWrap = "break-word";
    mirror.style.left = "-9999px";
    mirror.style.top = "0";
    mirror.style.width = `${textarea.clientWidth}px`;

    const styleProps = [
        "boxSizing",
        "fontFamily",
        "fontSize",
        "fontWeight",
        "fontStyle",
        "letterSpacing",
        "lineHeight",
        "textTransform",
        "textIndent",
        "textDecoration",
        "paddingTop",
        "paddingRight",
        "paddingBottom",
        "paddingLeft",
        "borderTopWidth",
        "borderRightWidth",
        "borderBottomWidth",
        "borderLeftWidth",
        "borderTopStyle",
        "borderRightStyle",
        "borderBottomStyle",
        "borderLeftStyle",
    ] as const;

    for (const prop of styleProps) {
        mirror.style[prop] = computed[prop];
    }

    mirror.textContent = textarea.value.slice(0, safeCursor);

    const marker = document.createElement("span");
    marker.textContent = textarea.value.slice(safeCursor) || "\u200b";
    mirror.appendChild(marker);
    document.body.appendChild(mirror);

    const top = marker.offsetTop - textarea.scrollTop;
    const left = marker.offsetLeft - textarea.scrollLeft;

    document.body.removeChild(mirror);

    return { top, left };
}

export default function LatexTextareaPreview({
    value,
    onChange,
    onKeyDown,
    rows = 3,
    className,
    placeholder,
    autoFocus = false,
    performOcr,
    showOcrButton = true,
    footerActions,
}: LatexTextareaPreviewProps) {
    const [formulaDialogVisible, setFormulaDialogVisible] = useState(false);
    const [formulaLatex, setFormulaLatex] = useState("");
    const ocrInputRef = useRef<HTMLInputElement>(null);
    const [isOcring, setIsOcring] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [pendingOcrFile, setPendingOcrFile] = useState<File | null>(null);
    const { showError } = useToast();

    const containerRef = useRef<HTMLDivElement>(null);
    const undoStackRef = useRef<string[]>([]);
    const redoStackRef = useRef<string[]>([]);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const [selectedSymbol, setSelectedSymbol] = useState("");
    const [selectedGreek, setSelectedGreek] = useState("");
    const formulaInsertRangeRef = useRef({ start: 0, end: 0 });
    const [commandSuggestions, setCommandSuggestions] = useState<string[]>([]);
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
    const [commandReplaceRange, setCommandReplaceRange] = useState<{ start: number; end: number } | null>(null);
    const [suggestionAnchor, setSuggestionAnchor] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

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

    const focusTextareaAt = useCallback((cursor: number) => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const textarea = getTextarea();
                if (!textarea) return;
                textarea.focus();
                textarea.setSelectionRange(cursor, cursor);
            });
        });
    }, [getTextarea]);

    const insertAtRange = useCallback((token: string, start: number, end: number) => {
        const safeStart = Math.max(0, Math.min(start, value.length));
        const safeEnd = Math.max(safeStart, Math.min(end, value.length));
        const nextValue = `${value.slice(0, safeStart)}${token}${value.slice(safeEnd)}`;
        const nextCursor = safeStart + token.length;
        applyValue(nextValue);
    }, [applyValue, focusTextareaAt, value]);

    const insertAtCursor = useCallback(
        (token: string) => {
            const textarea = getTextarea();
            if (!textarea) {
                insertAtRange(token, value.length, value.length);
                return;
            }

            const start = textarea.selectionStart ?? value.length;
            const end = textarea.selectionEnd ?? value.length;
            insertAtRange(token, start, end);
            focusTextareaAt(start + token.length);
        },
        [getTextarea, insertAtRange, value],
    );

    const clearCommandSuggestions = useCallback(() => {
        setCommandSuggestions([]);
        setActiveSuggestionIndex(0);
        setCommandReplaceRange(null);
    }, []);

    const updateCommandSuggestions = useCallback((
        text: string,
        cursor: number,
        textarea?: HTMLTextAreaElement | null,
    ) => {
        const safeCursor = Math.max(0, Math.min(cursor, text.length));
        const beforeCursor = text.slice(0, safeCursor);
        const commandMatch = beforeCursor.match(/\\[a-zA-Z]+$/);

        if (!commandMatch) {
            clearCommandSuggestions();
            return;
        }

        const typedCommand = commandMatch[0];
        if (typedCommand.length < 3) {
            clearCommandSuggestions();
            return;
        }

        const matched = LATEX_COMMAND_SUGGESTIONS
            .filter((command) => command.startsWith(typedCommand) && command !== typedCommand)
            .slice(0, 8);

        if (matched.length === 0) {
            clearCommandSuggestions();
            return;
        }

        setCommandSuggestions(matched);
        setActiveSuggestionIndex(0);
        setCommandReplaceRange({
            start: safeCursor - typedCommand.length,
            end: safeCursor,
        });

        if (textarea) {
            const caret = getTextareaCaretPosition(textarea, safeCursor);
            const lineHeight = Number.parseFloat(window.getComputedStyle(textarea).lineHeight || "20") || 20;
            console.log("line height:", lineHeight);
            setSuggestionAnchor({
                top: textarea.offsetTop + caret.top + lineHeight,
                left: textarea.offsetLeft + caret.left,
            });
        }
    }, [clearCommandSuggestions]);

    const applyCommandSuggestion = useCallback((command: string) => {
        if (!commandReplaceRange) return;

        const nextValue = `${value.slice(0, commandReplaceRange.start)}${command} ${value.slice(commandReplaceRange.end)}`;
        const nextCursor = commandReplaceRange.start + command.length + 1;
        applyValue(nextValue);
        clearCommandSuggestions();
        focusTextareaAt(nextCursor);
    }, [applyValue, clearCommandSuggestions, commandReplaceRange, focusTextareaAt, value]);

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

    useEffect(() => {
        syncHistoryButtons();
    }, [syncHistoryButtons]);

    const clearPreviewState = useCallback(() => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(null);
        setPendingOcrFile(null);
        setIsPreviewOpen(false);
    }, [previewUrl]);

    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const handleOcrClick = useCallback(() => {
        if (isOcring) {
            return;
        }
        ocrInputRef.current?.click();
    }, [isOcring]);

    const handleOcrChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files?.length) {
            return;
        }

        const file = event.target.files[0];
        event.target.value = "";

        if (!file) {
            return;
        }

        const nextUrl = URL.createObjectURL(file);
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(nextUrl);
        setPendingOcrFile(file);
        setIsPreviewOpen(true);
    }, [previewUrl]);

    const handlePreviewConfirm = useCallback(async (croppedFile: File | null) => {
        if (!pendingOcrFile) {
            return;
        }

        try {
            setIsOcring(true);
            const fileForOcr = croppedFile ?? pendingOcrFile;
            if (performOcr) {
                const ocrText = await performOcr(fileForOcr);
                const nextValue = value.trim() ? `${value}\n${ocrText}` : ocrText;
                applyValue(nextValue);
            }
            clearPreviewState();
        } catch (error) {
            console.error("OCR failed:", error);
            showError("请确保上传的是清晰的图片，并且只包含打印内容。", "OCR 失败");
        } finally {
            setIsOcring(false);
        }
    }, [applyValue, clearPreviewState, pendingOcrFile, showError, value]);

    return (
        <div className={`relative flex-1 ${className ?? ""}`} ref={containerRef}>
            <OcrPreviewModal
                isOpen={isPreviewOpen}
                previewUrl={previewUrl}
                isOcring={isOcring}
                onCancel={clearPreviewState}
                onConfirm={handlePreviewConfirm}
            />
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
                onChange={(event) => {
                    const nextValue = event.target.value;
                    const cursor = event.target.selectionStart ?? nextValue.length;
                    applyValue(nextValue);
                    updateCommandSuggestions(nextValue, cursor, event.target);
                }}
                onClick={(event) => {
                    const target = event.target as HTMLTextAreaElement;
                    const cursor = target.selectionStart ?? value.length;
                    updateCommandSuggestions(value, cursor, target);
                }}
                onKeyDown={(event) => {
                    if (commandSuggestions.length > 0) {
                        if (event.key === "ArrowDown") {
                            event.preventDefault();
                            setActiveSuggestionIndex((prev) =>
                                prev + 1 >= commandSuggestions.length ? 0 : prev + 1
                            );
                            return;
                        }

                        if (event.key === "ArrowUp") {
                            event.preventDefault();
                            setActiveSuggestionIndex((prev) =>
                                prev - 1 < 0 ? commandSuggestions.length - 1 : prev - 1
                            );
                            return;
                        }

                        if (event.key === "Enter" || event.key === "Tab") {
                            event.preventDefault();
                            applyCommandSuggestion(commandSuggestions[activeSuggestionIndex]);
                            return;
                        }

                        if (event.key === "Escape") {
                            event.preventDefault();
                            clearCommandSuggestions();
                            return;
                        }
                    }

                    onKeyDown?.(event);
                }}
                onBlur={() => {
                    setTimeout(() => clearCommandSuggestions(), 100);
                }}
                className="w-full rounded border border-[var(--surface-border)] bg-[var(--hover)] px-3 py-2"
                rows={rows}
                placeholder={placeholder}
                autoFocus={autoFocus}
            />
            {commandSuggestions.length > 0 && (
                <div
                    className="absolute z-20 max-h-44 min-w-36 overflow-y-auto rounded border border-[var(--surface-border)] bg-[var(--surface)] p-1 shadow-sm"
                    style={{
                        top: suggestionAnchor.top,
                        left: suggestionAnchor.left,
                    }}
                >
                    {commandSuggestions.map((command, index) => (
                        <button
                            key={command}
                            type="button"
                            className={`block w-full rounded px-2 py-1 text-left text-xs ${index === activeSuggestionIndex ? "bg-[var(--hover)]" : ""
                                }`}
                            onMouseDown={(event) => {
                                event.preventDefault();
                                applyCommandSuggestion(command);
                            }}
                        >
                            {command}
                        </button>
                    ))}
                </div>
            )}
            <div className="mt-2 flex items-center justify-end gap-2">
                <Button
                    type="button"
                    label="插入公式"
                    icon="pi pi-calculator"
                    outlined
                    size="small"
                    onClick={() => {
                        const textarea = getTextarea();
                        const start = textarea?.selectionStart ?? value.length;
                        const end = textarea?.selectionEnd ?? value.length;
                        formulaInsertRangeRef.current = { start, end };
                        setFormulaLatex("");
                        setFormulaDialogVisible(true);
                    }}
                />
                {showOcrButton && (
                    <>
                        <Button
                            type="button"
                            label="OCR"
                            icon="pi pi-image"
                            outlined
                            size="small"
                            onClick={handleOcrClick}
                            disabled={isOcring}
                            aria-label="OCR 识别并插入"
                        />
                        <input
                            ref={ocrInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleOcrChange}
                        />
                    </>
                )}
                {footerActions}
            </div>
            <div className="mt-2 rounded border border-[var(--surface-border)] bg-[var(--surface)] p-3">
                <p className="mb-2 text-xs text-[var(--muted)]">LaTeX 预览</p>
                <AutoLatex className="min-h-8 text-sm" text={value || ""} />
            </div>
            <Dialog
                //mathlive 的虚拟键盘默认的z-index是105，小于105保证虚拟键盘可以显示在dialog上方
                baseZIndex={100}
                visible={formulaDialogVisible}
                onHide={() => setFormulaDialogVisible(false)}
                style={{ width: "100vw", height: "100vh", maxHeight: "100vh", margin: 0, borderRadius: 0 }}
                contentStyle={{ padding: 0 }}
                modal
                draggable={false}
                resizable={false}
                closable={false}
                header={
                    <div className="flex justify-center py-1">
                        <h1 className="text-xl font-semibold">插入数学公式</h1>
                    </div>
                }
            >
                <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-6">
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
                                    onClick={() => setFormulaLatex((prev) => `${prev}${t.latex}`)}
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
                        <Button
                            type="button"
                            label="取消"
                            severity="secondary"
                            outlined
                            onClick={() => setFormulaDialogVisible(false)}
                        />
                        <Button
                            type="button"
                            label="插入"
                            icon="pi pi-check"
                            onClick={() => {
                                const trimmed = formulaLatex.trim();
                                setFormulaDialogVisible(false);
                                if (trimmed) {
                                    const formulaText = `$${trimmed}$`;
                                    insertAtRange(
                                        formulaText,
                                        formulaInsertRangeRef.current.start,
                                        formulaInsertRangeRef.current.end
                                    );
                                }
                            }}
                        />
                    </div>
                </div>
            </Dialog>
        </div>
    );
}
