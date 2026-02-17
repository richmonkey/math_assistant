"use client";

import { Toast } from "primereact/toast";
import { createContext, useContext, useMemo, useRef } from "react";

type ToastSeverity = "success" | "info" | "warn" | "error";

type ToastMessage = {
    severity?: ToastSeverity;
    summary?: string;
    detail?: string;
    life?: number;
};

type ToastContextValue = {
    showMessage: (message: ToastMessage) => void;
    showError: (detail: string, summary?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const toastRef = useRef<Toast>(null);

    const value = useMemo(
        () => ({
            showMessage: (message: ToastMessage) => {
                toastRef.current?.show(message);
            },
            showError: (detail: string, summary = "导入失败") => {
                toastRef.current?.show({
                    severity: "error",
                    summary,
                    detail,
                    life: 4000,
                });
            },
        }),
        []
    );

    return (
        <ToastContext.Provider value={value}>
            <Toast ref={toastRef} position="top-right" />
            {children}
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within ToastProvider");
    }
    return context;
}
