
export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';

interface PriorityFactors {
    senderWeight: number;    // 0.4
    contentWeight: number;   // 0.3
    urgencyWeight: number;   // 0.2
    contextWeight: number;   // 0.1
}

const HIGH_PRIORITY_KEYWORDS = ['urgent', 'important', 'deadline', 'asap', 'action required', 'meeting', 'review'];
const LOW_PRIORITY_KEYWORDS = ['newsletter', 'promotion', 'social', 'notification', 'automated'];

export function classifyPriority(
    from: string,
    subject: string,
    body: string,
    isVip: boolean = false,
    isFrequentContact: boolean = false
): { priority: Priority; score: number } {

    // 1. Sender Weight (0.4)
    let senderWeight = 0.5; // Default middle
    if (isVip) senderWeight = 1.0;
    else if (isFrequentContact) senderWeight = 0.8;
    else if (from.includes('.gov') || from.includes('.edu')) senderWeight = 0.7;

    // 2. Content Weight (0.3)
    let contentWeight = 0.5;
    const lowerSubject = subject.toLowerCase();
    const lowerBody = body.toLowerCase();

    if (HIGH_PRIORITY_KEYWORDS.some(kw => lowerSubject.includes(kw) || lowerBody.includes(kw))) {
        contentWeight = 0.9;
    } else if (LOW_PRIORITY_KEYWORDS.some(kw => lowerSubject.includes(kw) || lowerBody.includes(kw))) {
        contentWeight = 0.2;
    }

    // 3. Urgency Weight (0.2)
    let urgencyWeight = 0.5;
    if (lowerSubject.includes('urgent') || lowerSubject.includes('asap')) {
        urgencyWeight = 1.0;
    } else if (lowerSubject.includes('re:') || lowerSubject.includes('fwd:')) {
        urgencyWeight = 0.7; // Conversation threads are higher priority
    }

    // 4. Context Weight (0.1)
    let contextWeight = 0.5;
    const hour = new Date().getHours();
    if (hour >= 9 && hour <= 17) {
        contextWeight = 0.8; // Business hours
    }

    const score = (
        senderWeight * 0.4 +
        contentWeight * 0.3 +
        urgencyWeight * 0.2 +
        contextWeight * 0.1
    );

    let priority: Priority = 'MEDIUM';
    if (score > 0.7) priority = 'HIGH';
    else if (score < 0.4) priority = 'LOW';

    return { priority, score };
}
