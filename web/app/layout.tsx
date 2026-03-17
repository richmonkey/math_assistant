import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PrimeReactProvider } from 'primereact/api';
import { ThemeProvider } from "./theme-context";
import { PapersProvider } from "./papers-context";
import { ToastProvider } from "./toast-context";
import OllamaInitializer from "./components/OllamaInitializer";
import AuthGate from "./components/AuthGate";
import "primereact/resources/themes/lara-light-cyan/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import "./globals.css";


const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Math Assistant",
    description: "基于 Ollama 的数学试卷智能助手，支持自动生成试卷、智能批改和个性化学习建议。",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                <PrimeReactProvider>
                    <ThemeProvider>
                        <PapersProvider>
                            <ToastProvider>
                                <AuthGate>
                                    <OllamaInitializer>{children}</OllamaInitializer>
                                </AuthGate>
                            </ToastProvider>
                        </PapersProvider>
                    </ThemeProvider>
                </PrimeReactProvider>
            </body>
        </html>
    );
}
