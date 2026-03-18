import { chatCompletions } from "./ai";
import {
    isTxtFile,
    parseQuestionsFromPayload,
    parseQuestionsFromTxtFile,
} from "./txt-import";

export type PaperQuestion = {
    number: string;
    type: "multiple_choice" | "fill_blank" | "calculation" | "proof" | "judge" | "unknown";
    content: string;
    options: { label: string; text: string }[];
};

function extractJsonPayload(raw: string): string {
    const content = raw.trim();
    if (!content) {
        throw new Error("OCR output is empty");
    }

    if (content.startsWith("```") && content.endsWith("```")) {
        return content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    }

    const objectStart = content.indexOf("{");
    const arrayStart = content.indexOf("[");
    let start = -1;
    if (objectStart >= 0 && arrayStart >= 0) {
        start = Math.min(objectStart, arrayStart);
    } else {
        start = objectStart >= 0 ? objectStart : arrayStart;
    }

    if (start < 0) {
        return content;
    }

    const objectEnd = content.lastIndexOf("}");
    const arrayEnd = content.lastIndexOf("]");
    const end = Math.max(objectEnd, arrayEnd);

    if (end <= start) {
        return content.slice(start);
    }

    return content.slice(start, end + 1);
}

function repairInvalidJsonEscapes(jsonText: string): string {
    let result = "";
    let inString = false;
    let stringQuote: '"' | "'" | "" = "";

    for (let i = 0; i < jsonText.length; i += 1) {
        const char = jsonText[i];
        const prevChar = i > 0 ? jsonText[i - 1] : "";

        if ((char === '"' || char === "'") && prevChar !== "\\") {
            if (!inString) {
                inString = true;
                stringQuote = char;
            } else if (char === stringQuote) {
                inString = false;
                stringQuote = "";
            }
            result += char;
            continue;
        }

        if (inString && char === "\\") {
            const nextChar = i + 1 < jsonText.length ? jsonText[i + 1] : "";
            const isValidEscape =
                nextChar === '"' ||
                nextChar === "\\" ||
                nextChar === "/" ||
                nextChar === "b" ||
                nextChar === "f" ||
                nextChar === "n" ||
                nextChar === "r" ||
                nextChar === "t" ||
                nextChar === "u";

            if (!isValidEscape) {
                result += "\\";
            }
        }

        result += char;
    }

    return result;
}

function parseOcrJson<T>(raw: string): T {
    const payload = extractJsonPayload(raw);
    try {
        return JSON.parse(payload) as T;
    } catch {
        const repaired = repairInvalidJsonEscapes(payload);
        return JSON.parse(repaired) as T;
    }
}

async function _performOcr(file: File, prompt: string): Promise<string> {
    const content = await chatCompletions(prompt, file);
    return content.trim();
}

export async function load_paper_image(img: File): Promise<PaperQuestion[]> {
    if (isTxtFile(img)) {
        return parseQuestionsFromTxtFile(img);
    }

    const prompt = `You are a professional OCR system specialized in high school mathematics exams.

Your task is to extract ONLY printed content from the provided exam image and convert it into structured JSON.

STRICT RULES:

1. Extract only printed text. Ignore ALL handwritten answers, scribbles, corrections, underlines, marks, or stamps.
2. Preserve question numbering exactly as shown.
3. Convert all mathematical expressions into standard LaTeX format.
   - Use $...$ for inline formulas
   - Use $$...$$ for displayed equations
4. Do NOT summarize.
5. Do NOT explain.
6. Do NOT guess missing parts.
7. Do NOT repeat any content.
8. If a question is incomplete or unclear, extract only the visible part.
9. When the page ends, STOP immediately.
10. Output VALID JSON only. No extra text before or after JSON.

JSON FORMAT:

{
  "page": 1,
  "exam_title": "",
  "questions": [
    {
      "number": "",
      "type": "multiple_choice | fill_blank | calculation | proof | judge | unknown",
      "content": "",
    }
  ]
}

Additional rules:
- If the exam title is visible, extract it. Otherwise leave it empty.
- Keep line breaks inside content using \n.
- Ensure the output is strictly valid JSON.

Return JSON only.`;

    let content = await _performOcr(img, prompt);
    console.log(content);
    const obj = parseOcrJson<unknown>(content);
    const questions = parseQuestionsFromPayload(obj);
    console.log("Extracted JSON:", { questions });
    return questions;
}

export async function performQuestionOcr(file: File): Promise<PaperQuestion> {
    const prompt = `You are a professional OCR system specialized in high school mathematics exams.

Your task is to extract ONLY printed content from the provided exam image and convert it into structured JSON.

STRICT RULES:

1. Extract only printed text. Ignore ALL handwritten answers, scribbles, corrections, underlines, marks, or stamps.
2. Preserve question numbering exactly as shown.
3. Convert all mathematical expressions into standard LaTeX format.
   - Use $...$ for inline formulas
   - Use $$...$$ for displayed equations
4. Do NOT summarize.
5. Do NOT explain.
6. Do NOT guess missing parts.
7. Do NOT repeat any content.
8. If a question is incomplete or unclear, extract only the visible part.
9. When the page ends, STOP immediately.
10. Output VALID JSON only. No extra text before or after JSON.

JSON FORMAT:

{
    "type": "multiple_choice | fill_blank | calculation | proof | unknown",
    "content": "",
}

Additional rules:
- Keep line breaks inside content using \n.
- Ensure the output is strictly valid JSON.

Return JSON only.`;
    let content = await _performOcr(file, prompt);
    console.log(content);
    const obj = parseOcrJson<PaperQuestion>(content);
    console.log("Extracted JSON:", obj);
    if (!obj.content || !obj.type) {
        throw new Error("OCR output is missing required fields");
    }
    return obj;
}

export async function performAnswerOcr(file: File): Promise<string> {
    const prompt = `You are a professional OCR system specialized in math exam answers.

Extract text from the image and return plain text.

Rules:
1. Convert all math expressions into LaTeX format.
2. Use $...$ for inline math and $$...$$ for display math.
3. Preserve line breaks if they exist.
4. Do not summarize or add explanations.
5. Output text only, no JSON or extra wrapper.`;

    let ocrText = await _performOcr(file, prompt);
    return ocrText ?? "";
}
