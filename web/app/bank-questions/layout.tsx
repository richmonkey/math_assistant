import { BankQuestionsProvider } from "./bank-questions-context";

export default function BankQuestionsLayout({ children }: { children: React.ReactNode }) {
    return <BankQuestionsProvider>{children}</BankQuestionsProvider>;
}
