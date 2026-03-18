"use client";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import type { Components } from "react-markdown";

const components: Components = {
    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
    h1: ({ children }) => <h1 className="mb-2 text-xl font-bold">{children}</h1>,
    h2: ({ children }) => <h2 className="mb-2 text-lg font-semibold">{children}</h2>,
    h3: ({ children }) => <h3 className="mb-2 text-base font-semibold">{children}</h3>,
    ul: ({ children }) => <ul className="mb-2 list-disc pl-5">{children}</ul>,
    ol: ({ children }) => <ol className="mb-2 list-decimal pl-5">{children}</ol>,
    li: ({ children }) => <li className="mb-0.5">{children}</li>,
    blockquote: ({ children }) => (
        <blockquote className="mb-2 border-l-2 border-[var(--surface-border)] pl-3 text-[var(--muted)]">
            {children}
        </blockquote>
    ),
    code: ({ className, children, ...props }) => {
        const isBlock = className?.startsWith("language-");
        return isBlock ? (
            <code
                className="block overflow-x-auto rounded bg-[var(--hover)] px-3 py-2 text-xs"
                {...props}
            >
                {children}
            </code>
        ) : (
            <code
                className="rounded bg-[var(--hover)] px-1 py-0.5 text-xs"
                {...props}
            >
                {children}
            </code>
        );
    },
    pre: ({ children }) => <pre className="mb-2 overflow-x-auto">{children}</pre>,
    hr: () => <hr className="my-3 border-[var(--surface-border)]" />,
    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
    a: ({ href, children }) => (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
        >
            {children}
        </a>
    ),
};

export default function MarkdownMessage({
    content,
    className,
}: {
    content: string;
    className?: string;
}) {
    return (
        <div className={`text-sm leading-relaxed ${className ?? ""}`}>
            <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={components}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
