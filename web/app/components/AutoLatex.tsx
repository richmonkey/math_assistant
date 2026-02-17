import { useEffect, useRef } from 'react';
//@ts-ignore
import renderMathInElement from 'katex/dist/contrib/auto-render';
import 'katex/dist/katex.min.css';

const AutoLatex = ({ text, className }: { text: string; className?: string }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current) {
            // 核心配置：定义哪些符号是数学公式
            renderMathInElement(containerRef.current, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },  // 块级
                    { left: '$', right: '$', display: false },   // 行内
                    { left: '\\(', right: '\\)', display: false }, // LaTeX 标准行内
                    { left: '\\[', right: '\\]', display: true }   // LaTeX 标准块级
                ],
                // 忽略标签，防止渲染 script 或 style 里的内容
                ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
                // 错误处理：不抛出异常，只在控制台警告
                throwOnError: false
            });
        }
    }, [text]); // 当文本变化时重新渲染

    return (
        // 使用 dangerouslySetInnerHTML 并不完美，但对于纯文本渲染是最高效的
        // 如果你的 text 包含 HTML 标签，请确保它是安全的（sanitize 过）
        <div ref={containerRef} className={`${className ?? ""} whitespace-pre-wrap`}>
            {text}
        </div>
    );
};

export default AutoLatex;