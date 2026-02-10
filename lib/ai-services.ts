
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

export async function summarizeEmail(body: string): Promise<string> {
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
        return 'Summary unavailable: Google Gemini API key not configured.';
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = `Summarize the following email concisely in 2-3 sentences, highlighting key points, action items, and deadlines if any:\n\n${body}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim() || 'No summary generated.';
    } catch (error) {
        console.error('Gemini Summary Error:', error);
        return 'Error generating summary.';
    }
}

export async function translateToTamil(text: string): Promise<string> {
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
        return 'Translation unavailable: Google Gemini API key not configured.';
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = `Translate the following English text to Tamil professionaly:\n\n${text}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim() || 'No translation generated.';
    } catch (error) {
        console.error('Gemini Translation Error:', error);
        return 'Error generating translation.';
    }
}
