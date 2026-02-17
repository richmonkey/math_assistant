import ollama from "ollama/browser";

export type PaperQuestion = {
    number: string;
    type: "multiple_choice" | "fill_blank" | "calculation" | "proof" | "unknown";
    content: string;
    options: { label: string; text: string }[];
};

export async function load_paper_image(img: File): Promise<PaperQuestion[]> {
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
      "type": "multiple_choice | fill_blank | calculation | proof | unknown",
      "content": "",
      "options": [
        {"label": "A", "text": ""},
        {"label": "B", "text": ""},
        {"label": "C", "text": ""},
        {"label": "D", "text": ""}
      ]
    }
  ]
}

Additional rules:
- If the exam title is visible, extract it. Otherwise leave it empty.
- If a question has no options, set "options": [].
- Keep line breaks inside content using \n.
- Ensure the output is strictly valid JSON.

Return JSON only.`;

    const arrayBuffer = await img.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    console.log("Loaded image as Uint8Array:", uint8Array);

    const encodedImage = await ollama.encodeImage(uint8Array);
    const response = await ollama.chat({
        model: "qwen3-vl:8b-instruct",
        messages: [
            {
                role: "user",
                content: prompt,
                images: [encodedImage],
            },
        ],
    });
    console.log(response.message.content);
    const obj = JSON.parse(response.message.content);
    console.log("Extracted JSON:", obj);
    return obj.questions;
}

export async function performOcr(file: File): Promise<string> {
    const prompt = `You are a professional OCR system specialized in math exam answers.

Extract text from the image and return plain text.

Rules:
1. Convert all math expressions into LaTeX format.
2. Use $...$ for inline math and $$...$$ for display math.
3. Preserve line breaks if they exist.
4. Do not summarize or add explanations.
5. Output text only, no JSON or extra wrapper.`;
    const arrayBuffer = await file.arrayBuffer();
    const encodedImage = await ollama.encodeImage(new Uint8Array(arrayBuffer));
    const response = await ollama.chat({
        model: "qwen3-vl:8b-instruct",
        messages: [
            {
                role: "user",
                content: prompt,
                images: [encodedImage],
            },
        ],
    });

    const ocrText = response.message.content?.trim();
    if (ocrText === "$$ $$") {
        return "";
    }
    return ocrText ?? "";
}
