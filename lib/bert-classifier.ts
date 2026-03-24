/**
 * BERT ML Classifier Client
 * Communicates with the Python FastAPI server to get AI-powered classifications
 */

export interface BertPrediction {
    spam: string;
    is_spam: boolean;
    spam_confidence: number;
    category: string;
    category_scores: Record<string, number>;
    priority: string;
    priority_score: number;  // 1 (Low), 2 (Medium), 3 (High)
    priority_scores: Record<string, number>;
}

const ML_SERVER_URL = process.env.ML_SERVER_URL || 'http://localhost:8000';

export class BertClassifierClient {
    private serverUrl: string;
    private isAvailable: boolean = false;

    constructor(serverUrl?: string) {
        this.serverUrl = serverUrl || ML_SERVER_URL;
    }

    /**
     * Check if ML server is available
     */
    async checkHealth(): Promise<boolean> {
        try {
            const response = await fetch(`${this.serverUrl}/health`, {
                method: 'GET',
                signal: AbortSignal.timeout(3000), // 3 second timeout
            });
            
            if (response.ok) {
                const data = await response.json();
                this.isAvailable = data.model_loaded === true;
                return this.isAvailable;
            }
            
            this.isAvailable = false;
            return false;
        } catch (error) {
            console.warn('ML server health check failed:', error);
            this.isAvailable = false;
            return false;
        }
    }

    /**
     * Classify a single email using BERT
     */
    async classify(subject: string, body: string): Promise<BertPrediction | null> {
        try {
            const text = `${subject} ${body}`.trim();
            
            const response = await fetch(`${this.serverUrl}/predict`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    text,
                    subject 
                }),
                signal: AbortSignal.timeout(10000), // 10 second timeout
            });

            if (!response.ok) {
                throw new Error(`ML server returned ${response.status}`);
            }

            const prediction: BertPrediction = await response.json();
            return prediction;
        } catch (error) {
            console.error('BERT classification failed:', error);
            return null;
        }
    }

    /**
     * Classify multiple emails in batch for efficiency
     */
    async classifyBatch(emails: Array<{ subject: string; body: string }>): Promise<BertPrediction[]> {
        try {
            const texts = emails.map(e => `${e.subject} ${e.body}`.trim());
            
            const response = await fetch(`${this.serverUrl}/predict/batch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ texts }),
                signal: AbortSignal.timeout(30000), // 30 second timeout for batch
            });

            if (!response.ok) {
                throw new Error(`ML server returned ${response.status}`);
            }

            const data = await response.json();
            return data.predictions || [];
        } catch (error) {
            console.error('BERT batch classification failed:', error);
            return [];
        }
    }

    /**
     * Quick spam-only check (faster endpoint)
     */
    async isSpam(subject: string, body: string): Promise<{ isSpam: boolean; confidence: number } | null> {
        try {
            const text = `${subject} ${body}`.trim();
            
            const response = await fetch(`${this.serverUrl}/predict/spam-only`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    text,
                    subject 
                }),
                signal: AbortSignal.timeout(5000),
            });

            if (!response.ok) {
                throw new Error(`ML server returned ${response.status}`);
            }

            const data = await response.json();
            return {
                isSpam: data.is_spam,
                confidence: data.confidence,
            };
        } catch (error) {
            console.error('BERT spam check failed:', error);
            return null;
        }
    }

    getServerUrl(): string {
        return this.serverUrl;
    }

    isServerAvailable(): boolean {
        return this.isAvailable;
    }
}

// Singleton instance
let bertClient: BertClassifierClient | null = null;

export function getBertClassifier(): BertClassifierClient {
    if (!bertClient) {
        bertClient = new BertClassifierClient();
    }
    return bertClient;
}

/**
 * Helper function to classify with fallback to simple classifier
 */
export async function classifyEmailWithBert(
    subject: string,
    body: string,
    fallbackToSimple: boolean = true
): Promise<{
    isSpam: boolean;
    priority: 'high' | 'medium' | 'low';
    category?: string;
    confidence?: number;
    usedBert: boolean;
}> {
    const bert = getBertClassifier();
    
    // Try BERT first
    const prediction = await bert.classify(subject, body);
    
    if (prediction) {
        return {
            isSpam: prediction.is_spam,
            priority: prediction.priority.toLowerCase() as 'high' | 'medium' | 'low',
            category: prediction.category,
            confidence: prediction.spam_confidence,
            usedBert: true,
        };
    }

    // Fallback to simple classifiers if BERT fails
    if (fallbackToSimple) {
        const { detectSpam, extractFeatures } = await import('./spam-detector');
        const { classifyPriority } = await import('./priority-classifier');

        const features = extractFeatures('', subject, body);
        const spamResult = detectSpam(features);
        const priorityResult = classifyPriority('', subject, body);

        return {
            isSpam: spamResult.isSpam,
            priority: priorityResult.priority.toLowerCase() as 'high' | 'medium' | 'low',
            confidence: spamResult.confidence,
            usedBert: false,
        };
    }

    // Default safe values
    return {
        isSpam: false,
        priority: 'medium',
        usedBert: false,
    };
}
