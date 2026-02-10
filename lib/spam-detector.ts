
import natural from 'natural';

export interface EmailFeatures {
    sender: string;
    subject: string;
    body: string;
    htmlToTextRatio: number;
    linksCount: number;
    imagesCount: number;
    capsInSubject: number;
    specialCharsInSubject: number;
}

const classifier = new natural.BayesClassifier();

// Simple training data for demonstration
// In a real app, this would be trained on a large dataset and persisted
classifier.addDocument('free winner urgent click here', 'spam');
classifier.addDocument('claim your prize now', 'spam');
classifier.addDocument('meeting at 10am tomorrow', 'ham');
classifier.addDocument('project update for review', 'ham');
classifier.addDocument('hey how are you doing', 'ham');
classifier.addDocument('buy cheap medication online', 'spam');
classifier.addDocument('invest in crypto today for big gains', 'spam');

classifier.train();

export function extractFeatures(from: string, subject: string, body: string, html?: string): EmailFeatures {
    const linksCount = (body.match(/https?:\/\/[^\s]+/g) || []).length;
    const imagesCount = (html?.match(/<img/g) || []).length;

    const textLength = body.length || 1;
    const htmlLength = html?.length || 0;
    const htmlToTextRatio = htmlLength / textLength;

    const capsInSubject = (subject.match(/[A-Z]/g) || []).length / (subject.length || 1);
    const specialCharsInSubject = (subject.match(/[!@#$%^&*()]/g) || []).length;

    return {
        sender: from,
        subject,
        body,
        htmlToTextRatio,
        linksCount,
        imagesCount,
        capsInSubject,
        specialCharsInSubject
    };
}

export function detectSpam(features: EmailFeatures): { isSpam: boolean; confidence: number } {
    const text = `${features.subject} ${features.body}`;
    const classification = classifier.classify(text);
    const classifications = classifier.getClassifications(text);

    const spamResult = classifications.find(c => c.label === 'spam');
    const confidence = spamResult ? spamResult.value : 0;

    // Combine Bayes with rule-based heuristics
    let heuristicSpamScore = 0;
    if (features.linksCount > 5) heuristicSpamScore += 0.2;
    if (features.capsInSubject > 0.5) heuristicSpamScore += 0.2;
    if (features.specialCharsInSubject > 3) heuristicSpamScore += 0.1;

    const totalConfidence = (confidence + heuristicSpamScore) / (1 + (heuristicSpamScore > 0 ? 0.5 : 0));

    return {
        isSpam: classification === 'spam' || totalConfidence > 0.7,
        confidence: Math.min(totalConfidence, 1)
    };
}
