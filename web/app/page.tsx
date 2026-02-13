"use client";

import Link from "next/link";
import { Button } from "primereact/button";
import { useTheme } from "./theme-context";
import { usePapers } from "./papers-context";
import NewPaperDialog from "./components/NewPaperDialog";

export default function Home() {
    const { papers } = usePapers();
    const { theme, toggleTheme } = useTheme();

    const handleToggleTheme = () => {
        toggleTheme();
    };

    return (
        <main className="mx-auto max-w-3xl p-6">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-semibold">试卷管理系统</h1>
                <div className="flex items-center gap-2">
                    <Button
                        label={theme === "dark" ? "浅色主题" : "深色主题"}
                        icon={theme === "dark" ? "pi pi-sun" : "pi pi-moon"}
                        severity="secondary"
                        outlined
                        onClick={handleToggleTheme}
                    />
                    <NewPaperDialog nextIndex={papers.length + 1} />
                </div>
            </div>

            <section className="rounded border border-[var(--surface-border)] bg-[var(--surface)]">
                {papers.length === 0 ? (
                    <p className="p-4 text-[var(--muted)]">暂无试卷</p>
                ) : (
                    <ul>
                        {papers.map((paper, index) => (
                            <li
                                key={paper.id}
                                className={`border-[var(--surface-border)] ${index !== papers.length - 1 ? "border-b" : ""}`}
                            >
                                <Link
                                    href={`/papers/${paper.id}`}
                                    className="block p-4 transition-colors hover:bg-[var(--hover)]"
                                >
                                    {paper.title}
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </main>
    );
}
