'use client';
import React, { useRef, useEffect } from 'react';
import type { DetailedHTMLProps, HTMLAttributes } from "react";
import 'mathlive';
import { applyHighSchoolMathKeyboard } from '../lib/math-keyboard';

declare module "react/jsx-runtime" {
    namespace JSX {
        interface IntrinsicElements {
            'math-field': DetailedHTMLProps<HTMLAttributes<MathfieldElement>, MathfieldElement>;
        }
    }
}


type MathfieldElement = HTMLElement & {
    value?: string;
    insert?: (latex: string) => void;
    focus?: () => void;
};

type MathEditorProps = {
    value: string;
    onChange: (value: string) => void;
    className?: string;
    virtualKeyboardMode?: 'manual' | 'onfocus' | 'off';
};

const MathEditor = ({
    value,
    onChange,
    className = '',
    virtualKeyboardMode = 'onfocus',
}: MathEditorProps) => {
    const mathfieldRef = useRef<MathfieldElement | null>(null);

    // 注册高中数学虚拟键盘（仅在第一次挂载时执行）
    useEffect(() => {
        applyHighSchoolMathKeyboard();
    }, []);
    useEffect(() => {
        const mathfield = mathfieldRef.current;
        if (!mathfield) return;

        const handleInput = (event: Event) => {
            const target = event.target as MathfieldElement;
            onChange(target.value ?? '');
        };

        mathfield.addEventListener('input', handleInput);

        return () => {
            mathfield.removeEventListener('input', handleInput);
        };
    }, [onChange]);

    useEffect(() => {
        const mathfield = mathfieldRef.current;
        if (!mathfield) return;

        // Avoid unnecessary updates to prevent cursor position issues
        if (mathfield.value !== value) {
            mathfield.value = value;
        }
    }, [value]);

    return (
        <div>
            <math-field ref={mathfieldRef} virtual-keyboard-mode={virtualKeyboardMode} className={className} />
        </div>
    );
};

export default MathEditor;

