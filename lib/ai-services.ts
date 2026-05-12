
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAICache = new Map<string, GoogleGenerativeAI>();
const XAI_BASE_URL = (process.env.XAI_BASE_URL || 'https://api.x.ai/v1').replace(/\/$/, '');

type ChatHistoryMessage = {
    role: 'user' | 'assistant';
    content: string;
};

type ChatContextEmail = {
    id: string;
    from: string;
    subject: string;
    body: string;
    createdAt: Date;
};

function stripHtml(input: string): string {
    return input
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function safeText(input: string, maxChars: number): string {
    return stripHtml(input).slice(0, maxChars);
}

function getAiProvider(): 'gemini' | 'grok' {
    return process.env.AI_PROVIDER?.toLowerCase() === 'grok' ? 'grok' : 'gemini';
}

function getConfiguredGeminiKeys(): string[] {
    const keys = [
        process.env.GOOGLE_GEMINI_API_KEY,
        process.env.GEMINI_API_KEY,
        ...(process.env.GEMINI_API_KEYS || '')
            .split(',')
            .map((k) => k.trim())
            .filter(Boolean),
    ].filter((k, index, arr): k is string => Boolean(k) && arr.indexOf(k) === index);

    return keys;
}

function getGeminiClient(apiKey: string): GoogleGenerativeAI {
    const cached = genAICache.get(apiKey);
    if (cached) return cached;

    const client = new GoogleGenerativeAI(apiKey);
    genAICache.set(apiKey, client);
    return client;
}

function getConfiguredXaiKeys(): string[] {
    const keys = [
        process.env.XAI_API_KEY,
        ...(process.env.XAI_API_KEYS || '')
            .split(',')
            .map((k) => k.trim())
            .filter(Boolean),
    ].filter((k, index, arr): k is string => Boolean(k) && arr.indexOf(k) === index);

    return keys;
}

function buildFallbackChatResponse(input: {
    message: string;
    contextEmails: ChatContextEmail[];
}): string {
    if (input.contextEmails.length === 0) {
        return 'I could not find relevant emails for this question. Try adding a keyword, sender name, or select an email first.';
    }

    const top = input.contextEmails.slice(0, 3);
    const lines = top.map((email, index) => {
        const subject = email.subject || '(No Subject)';
        return `${index + 1}. ${subject} from ${email.from}`;
    });

    return [
        'I could not reach the AI model right now, but here are the most relevant emails I found:',
        ...lines,
        '',
        'You can open one of these and ask again for a detailed summary or draft reply.',
    ].join('\n');
}

async function generateWithModelFallback(prompt: string, label: string): Promise<string | null> {
    const apiKeys = getConfiguredGeminiKeys();
    if (apiKeys.length === 0) {
        return null;
    }

    const envModelList = (process.env.GEMINI_MODEL_LIST || '')
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean);

    const modelNames = [
        process.env.GEMINI_MODEL_PRIMARY,
        ...envModelList,
        'gemini-flash-latest',
        'gemini-pro-latest',
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite',
    ].filter((m, index, arr): m is string => Boolean(m) && arr.indexOf(m) === index);

    let sawQuotaError = false;
    const exhaustedKeys = new Set<string>();
    const invalidKeys = new Set<string>();

    for (const modelName of modelNames) {
        let modelUnavailable = false;

        for (const apiKey of apiKeys) {
            if (exhaustedKeys.has(apiKey) || invalidKeys.has(apiKey)) {
                continue;
            }

            try {
                const model = getGeminiClient(apiKey).getGenerativeModel({ model: modelName });
                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text().trim();
                if (text) {
                    return text;
                }
            } catch (error) {
                const errorMessage = String(error);

                if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('quota exceeded')) {
                    sawQuotaError = true;
                    exhaustedKeys.add(apiKey);
                    console.warn(`${label} (${modelName}): quota exceeded for one API key`);
                    continue;
                }

                if (
                    errorMessage.includes('API_KEY_INVALID') ||
                    errorMessage.toLowerCase().includes('api key expired') ||
                    errorMessage.toLowerCase().includes('api key invalid') ||
                    (errorMessage.includes('400') && errorMessage.toLowerCase().includes('api key'))
                ) {
                    invalidKeys.add(apiKey);
                    console.warn(`${label} (${modelName}): invalid or expired API key`);
                    continue;
                }

                if (errorMessage.includes('404') || errorMessage.toLowerCase().includes('not found')) {
                    modelUnavailable = true;
                    console.warn(`${label} (${modelName}): model not available`);
                    break;
                }

                console.error(`${label} (${modelName}) Error:`, error);
            }
        }

        if (modelUnavailable) {
            continue;
        }
    }

    if (sawQuotaError && exhaustedKeys.size === apiKeys.length) {
        return '__QUOTA_EXCEEDED__';
    }

    if (invalidKeys.size === apiKeys.length) {
        return '__API_KEY_INVALID__';
    }

    return null;
}

async function generateWithGrok(prompt: string, label: string): Promise<string | null> {
    const apiKeys = getConfiguredXaiKeys();
    if (apiKeys.length === 0) {
        return null;
    }

    const model = process.env.XAI_MODEL || 'grok-2-latest';
    let sawQuotaError = false;
    const invalidKeys = new Set<string>();

    for (const apiKey of apiKeys) {
        if (invalidKeys.has(apiKey)) {
            continue;
        }

        try {
            const response = await fetch(`${XAI_BASE_URL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.2,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                const lowered = errorText.toLowerCase();

                if (response.status === 429 || lowered.includes('quota') || lowered.includes('rate limit')) {
                    sawQuotaError = true;
                    console.warn(`${label} (${model}): quota exceeded for one xAI key`);
                    continue;
                }

                if (
                    response.status === 401 ||
                    response.status === 403 ||
                    lowered.includes('invalid api key') ||
                    lowered.includes('api key expired')
                ) {
                    invalidKeys.add(apiKey);
                    console.warn(`${label} (${model}): invalid or expired xAI API key`);
                    continue;
                }

                if (response.status === 404) {
                    console.warn(`${label} (${model}): xAI model not available`);
                    return null;
                }

                console.error(`${label} (${model}) xAI Error:`, response.status, errorText);
                continue;
            }

            const data = await response.json();
            const text = data?.choices?.[0]?.message?.content?.trim();
            if (text) {
                return text;
            }
        } catch (error) {
            console.error(`${label} (${model}) xAI Request Error:`, error);
        }
    }

    if (invalidKeys.size === apiKeys.length) {
        return '__API_KEY_INVALID__';
    }

    if (sawQuotaError) {
        return '__QUOTA_EXCEEDED__';
    }

    return null;
}

async function generateTextWithProvider(prompt: string, label: string): Promise<string | null> {
    const provider = getAiProvider();
    if (provider === 'grok') {
        return generateWithGrok(prompt, label);
    }

    return generateWithModelFallback(prompt, label);
}

export async function summarizeEmail(body: string): Promise<string> {
    if (getAiProvider() === 'grok' && getConfiguredXaiKeys().length === 0) {
        return 'Summary unavailable: xAI API key not configured.';
    }

    if (getAiProvider() === 'gemini' && getConfiguredGeminiKeys().length === 0) {
        return 'Summary unavailable: Google Gemini API key not configured.';
    }

    const prompt = `Summarize the following email concisely in 2-3 sentences, highlighting key points, action items, and deadlines if any:\n\n${safeText(body, 8000)}`;
    const summary = await generateTextWithProvider(prompt, 'AI Summary');
    if (summary === '__QUOTA_EXCEEDED__') {
        return 'Summary temporarily unavailable: API quota exceeded. Please retry later.';
    }
    if (summary === '__API_KEY_INVALID__') {
        return 'Summary unavailable: all configured API keys are invalid or expired. Please update your keys.';
    }
    return summary || 'Summary unavailable right now. Please try again.';
}

export async function translateToTamil(text: string): Promise<string> {
    if (getAiProvider() === 'grok' && getConfiguredXaiKeys().length === 0) {
        return 'Translation unavailable: xAI API key not configured.';
    }

    if (getAiProvider() === 'gemini' && getConfiguredGeminiKeys().length === 0) {
        return 'Translation unavailable: Google Gemini API key not configured.';
    }

    const prompt = `Translate the following English text to Tamil professionally:\n\n${safeText(text, 6000)}`;
    const translation = await generateTextWithProvider(prompt, 'AI Translation');
    if (translation === '__QUOTA_EXCEEDED__') {
        return 'Translation temporarily unavailable: API quota exceeded. Please retry later.';
    }
    if (translation === '__API_KEY_INVALID__') {
        return 'Translation unavailable: all configured API keys are invalid or expired. Please update your keys.';
    }
    return translation || 'Translation unavailable right now. Please try again.';
}

export async function chatWithEmailContext(input: {
    message: string;
    history: ChatHistoryMessage[];
    contextEmails: ChatContextEmail[];
}): Promise<string> {
    if (getAiProvider() === 'grok' && getConfiguredXaiKeys().length === 0) {
        return buildFallbackChatResponse(input);
    }

    if (getAiProvider() === 'gemini' && getConfiguredGeminiKeys().length === 0) {
        return buildFallbackChatResponse(input);
    }

    const formattedHistory = input.history
        .slice(-8)
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join('\n');

    const formattedEmails = input.contextEmails
        .slice(0, 8)
        .map((email, index) => {
            const truncatedBody = safeText(email.body, 1200);
            return [
                `[EMAIL_${index + 1}]`,
                `id: ${email.id}`,
                `from: ${email.from}`,
                `subject: ${email.subject || '(No Subject)'}`,
                `createdAt: ${email.createdAt.toISOString()}`,
                `body: ${truncatedBody}`,
            ].join('\n');
        })
        .join('\n\n');

    const prompt = [
        'You are an email assistant for a single authenticated user.',
        'Use only the conversation and email context provided below.',
        'If data is missing, clearly say what is missing instead of inventing details.',
        'Keep responses concise, practical, and action-oriented.',
        '',
        'Conversation history:',
        formattedHistory || 'No previous history.',
        '',
        'Email context:',
        formattedEmails || 'No matching emails found.',
        '',
        `Current user message: ${input.message}`,
    ].join('\n');

    const response = await generateTextWithProvider(prompt, 'AI Chat');
    if (response === '__QUOTA_EXCEEDED__') {
        return 'AI provider quota is currently exceeded. I can still show relevant emails, but AI-generated answers are temporarily unavailable. Please retry later.';
    }
    if (response === '__API_KEY_INVALID__') {
        return 'All configured AI API keys are invalid or expired. Please renew or replace your keys in environment settings.';
    }
    return response || buildFallbackChatResponse(input);
}
