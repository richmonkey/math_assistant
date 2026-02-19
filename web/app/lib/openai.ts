import OpenAI from 'openai';

let openAIClient: {
    client: OpenAI;
    model: string;
    vlModel?: string;
};

export function initOpenAI(config: { baseURL: string, apiKey: string, model: string, vlModel?: string }) {
    const c = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
        dangerouslyAllowBrowser: true,
    });
    openAIClient = { client: c, model: config.model, vlModel: config.vlModel };
}

export function getOpenAI() {
    if (!openAIClient) {
        throw new Error("OpenAI client is not initialized. Please call initOpenAI first.");
    }
    return openAIClient.client;
}

async function encodeImageFileToDataUrl(image: File): Promise<string> {
    const imageDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Failed to read image file.'));
        reader.readAsDataURL(image);
    });
    return imageDataUrl;
}

export async function chatCompletions(prompt: string, image?: File) {
    const client = getOpenAI();
    let content: Array<
        { type: 'text'; text: string } |
        { type: 'image_url'; image_url: { url: string } }
    > = [];
    let model = openAIClient.model;
    if (image) {
        if (openAIClient.vlModel) {
            model = openAIClient.vlModel;
        }
        const encodedImage = await encodeImageFileToDataUrl(image);
        content.push({
            type: 'image_url',
            image_url: { url: encodedImage },
        });
    }
    content.push({ type: 'text', text: prompt });
    const completion = await client.chat.completions.create({
        model: model,
        messages: [{ role: 'user', content }],
    });

    return completion.choices[0].message.content ?? "";
}
