/**
 * 高中数学虚拟键盘布局配置
 *
 * 调用方式：在组件 mount 后执行 applyHighSchoolMathKeyboard()
 * 会在 mathVirtualKeyboard 上注册两个自定义 tab：
 *   · 高中数学 —— 基础运算、三角/对数、不等式、集合
 *   · 向量·排列 —— 向量、排列组合、数列、常用希腊字母
 * 同时保留内置的 numeric 数字键盘。
 */

// MathLive 对 label 字段支持 $$...$$ 语法渲染 LaTeX
type Keycap = {
    latex: string;
    label?: string;
    class?: string;
};

type Layer = { rows: Keycap[][] };
type Layout = { label: string; layers: Layer[] };

// ────────────────────────────────────────────────
// Tab 1: 高中数学 基础
// ────────────────────────────────────────────────
const mathBasicLayout: Layout = {
    label: '常用符号',
    layers: [
        {
            rows: [
                // ── Row 1: 分数 / 根式 / 乘方 ──
                [
                    { latex: '\\frac{#@}{#0}', label: 'a/b' },
                    { latex: '\\sqrt{#@}', label: '√x' },
                    { latex: '\\sqrt[3]{#@}', label: '∛x' },
                    { latex: '\\sqrt[#0]{#@}', label: 'ⁿ√x' },
                    { latex: '#@^{2}', label: 'x²' },
                    { latex: '#@^{#0}', label: 'xⁿ' },
                    { latex: '#@^{-1}', label: 'x⁻¹' },
                    { latex: '\\left|#@\\right|', label: '|x|' },
                    { latex: '\\pi', label: 'π' },
                    { latex: '\\infty', label: '∞' },
                ],
                // ── Row 2: 三角 / 反三角 ──
                [
                    { latex: '\\sin #0', label: 'sin x' },
                    { latex: '\\cos #0', label: 'cos x' },
                    { latex: '\\tan #0', label: 'tan x' },
                    { latex: '\\arcsin #0', label: 'sin⁻¹x', class: 'small' },
                    { latex: '\\arccos #0', label: 'cos⁻¹x', class: 'small' },
                    { latex: '\\arctan #0', label: 'tan⁻¹x', class: 'small' },
                    { latex: '\\lg #0', label: 'log₁₀x' },
                    { latex: '\\ln #0', label: 'logₑx' },
                    { latex: '\\log_{#0} #@', label: 'logₙx' },
                    { latex: 'e^{#@}', label: 'eˣ' },
                ],
                // ── Row 3: 关系 / 运算符 ──
                [
                    { latex: '\\leq', label: '≤' },
                    { latex: '\\geq', label: '≥' },
                    { latex: '\\neq', label: '≠' },
                    { latex: '\\approx', label: '≈' },
                    { latex: '\\pm', label: '±' },
                    { latex: '\\times', label: '×' },
                    { latex: '\\div', label: '÷' },
                    { latex: '\\cdot', label: '·' },
                    { latex: '^{\\circ}', label: '°' },
                    { latex: '\\%', label: '%' },
                ],
                // ── Row 4: 集合 ──
                [
                    { latex: '\\in', label: '∈' },
                    { latex: '\\notin', label: '∉' },
                    { latex: '\\subset', label: '⊂' },
                    { latex: '\\subseteq', label: '⊆' },
                    { latex: '\\cup', label: '∪' },
                    { latex: '\\cap', label: '∩' },
                    { latex: '\\emptyset', label: '∅' },
                    { latex: '\\complement_U #0', label: 'Cᵤ', class: 'small' },
                    { latex: '\\mathbb{R}', label: 'ℝ' },
                    { latex: '\\mathbb{Z}', label: 'ℤ' },
                ],
            ],
        },
    ],
};

// ────────────────────────────────────────────────
// Tab 2: 向量 · 排列组合 · 数列
// ────────────────────────────────────────────────
const mathAdvancedLayout: Layout = {
    label: '向量·排列',
    layers: [
        {
            rows: [
                // ── Row 1: 向量 / 几何 ──
                [
                    { latex: '\\vec{#@}', label: 'vec a' },
                    { latex: '\\overrightarrow{#0}', label: 'ray AB', class: 'small' },
                    { latex: '\\left|\\vec{#@}\\right|', label: '|vec a|' },
                    { latex: '\\vec{#0}\\cdot\\vec{#0}', label: 'vec a·vec b', class: 'small' },
                    { latex: '\\overline{#0}', label: 'seg AB' },
                    { latex: '\\angle #0', label: '∠A' },
                    { latex: '\\triangle #0', label: '△' },
                    { latex: '\\parallel', label: '∥' },
                    { latex: '\\perp', label: '⊥' },
                    { latex: '\\sim', label: '∽' },
                ],
                // ── Row 2: 排列组合 / 数列 ──
                [
                    { latex: '\\mathrm{C}_{#0}^{#0}', label: 'Cₙᵐ' },
                    { latex: '\\mathrm{A}_{#0}^{#0}', label: 'Aₙᵐ' },
                    { latex: '\\binom{#0}{#0}', label: '(n¦k)' },
                    { latex: '#0!', label: 'n!' },
                    { latex: '\\sum_{#0}^{#0} #0', label: 'Σ' },
                    { latex: 'a_{#0}', label: 'aₙ' },
                    { latex: 'S_{#0}', label: 'Sₙ' },
                    { latex: 'T_{#0}', label: 'Tₙ' },
                    { latex: 'q^{#0}', label: 'qⁿ' },
                    { latex: '\\lim_{#0 \\to #0} #0', label: 'lim' },
                ],
                // ── Row 3: 逻辑 / 推导 ──
                [
                    { latex: '\\therefore', label: '∴' },
                    { latex: '\\because', label: '∵' },
                    { latex: '\\Rightarrow', label: '⇒' },
                    { latex: '\\Leftrightarrow', label: '⇔' },
                    { latex: '\\forall', label: '∀' },
                    { latex: '\\exists', label: '∃' },
                    { latex: '\\max\\{#0\\}', label: 'max' },
                    { latex: '\\min\\{#0\\}', label: 'min' },
                    { latex: '\\lfloor #0 \\rfloor', label: '⌊x⌋', class: 'small' },
                    { latex: '\\lceil #0 \\rceil', label: '⌈x⌉', class: 'small' },
                ],
                // ── Row 4: 常用希腊字母 ──
                [
                    { latex: '\\alpha', label: 'α' },
                    { latex: '\\beta', label: 'β' },
                    { latex: '\\theta', label: 'θ' },
                    { latex: '\\omega', label: 'ω' },
                    { latex: '\\lambda', label: 'λ' },
                    { latex: '\\mu', label: 'μ' },
                    { latex: '\\Delta', label: 'Δ' },
                    { latex: '\\Sigma', label: 'Σ' },
                    { latex: '\\mathbb{N}', label: 'ℕ' },
                    { latex: '\\mathbb{Q}', label: 'ℚ' },
                ],
            ],
        },
    ],
};

/**
 * 将高中数学键盘布局注册到 mathVirtualKeyboard。
 * 必须在浏览器环境（客户端）调用。
 */
export function applyHighSchoolMathKeyboard(): void {
    if (typeof window === 'undefined') return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kbd = (window as any).mathVirtualKeyboard;
    if (!kbd) return;

    // 第一个 tab 会作为默认打开的 tab
    kbd.layouts = [mathBasicLayout, mathAdvancedLayout, 'numeric'];
}
