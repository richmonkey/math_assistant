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

            {papers.length === 0 ? (
                <section className="rounded border border-[var(--surface-border)] bg-[var(--surface)] p-8 text-center">
                    <p className="text-[var(--muted)]">暂无试卷，点击右上角"添加试卷"开始创建</p>
                </section>
            ) : (
                <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
                    {papers.map((paper) => {
                        const updateDate = new Date(paper.updatedAt);
                        const formattedDate = `${updateDate.getFullYear()}-${String(updateDate.getMonth() + 1).padStart(2, '0')}-${String(updateDate.getDate()).padStart(2, '0')}`;

                        return (
                            <Link
                                key={paper.id}
                                href={`/papers?paperId=${encodeURIComponent(paper.id)}`}
                                className="group block rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] p-5 transition-all hover:border-[var(--foreground)] hover:shadow-lg"
                            >
                                <div className="mb-3 flex items-start justify-between gap-3">
                                    <h3 className="text-lg font-semibold transition-colors group-hover:text-[var(--foreground)]">
                                        {paper.title}
                                    </h3>
                                    <span className="shrink-0 rounded bg-[var(--hover)] px-2 py-1 text-xs text-[var(--muted)]">
                                        {paper.questions.length} 题
                                    </span>
                                </div>
                                {paper.description && (
                                    <p className="mb-3 line-clamp-2 text-sm text-[var(--muted)]">
                                        {paper.description}
                                    </p>
                                )}
                                <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                                    <i className="pi pi-clock" />
                                    <span>更新于 {formattedDate}</span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </main>
    );
}
