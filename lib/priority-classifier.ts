
export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Advanced Priority Engine
 * Uses multiple dimensions:
 * 1. Sender Reputation (VIP, frequent contact, organizational domain)
 * 2. Urgency Cues (deadlines, date mentions, specific urgency keywords)
 * 3. Thread Context (replies vs new threads)
 * 4. Content Analysis (questions, action items, personal requests)
 * 5. Time Context (business hours, recent arrival)
 */

const HIGH_PRIORITY_KEYWORDS = [
    'urgent', 'important', 'deadline', 'asap', 'action required', 'meeting', 
    'review', 'immediate', 'today', 'tomorrow', 'due', 'critcal', 'emergency',
    'security', 'unauthorized', 'suspicious', 'alert', 'notification', 'password reset'
];

const LOW_PRIORITY_KEYWORDS = [
    'newsletter', 'promotion', 'social', 'notification', 'automated', 
    'digest', 'weekly', 'monthly', 'unzip', 'unsubscribe', 'offers'
];

const URGENCY_TIME_KEYWORDS = [
    /\btoday\b/i,
    /\btomorrow\b/i,
    /\bby\s+\d{1,2}(am|pm)?\b/i,
    /\bdeadline\b/i,
    /\bexpire/i,
    /\bclosing\s+soon\b/i
];

export function classifyPriority(
    from: string,
    subject: string,
    body: string,
    isVip: boolean = false,
    isFrequentContact: boolean = false
): { priority: Priority; score: number; reasons: string[] } {
    const reasons: string[] = [];
    const lowerFrom = from.toLowerCase();
    const lowerSubject = subject.toLowerCase();
    const lowerBody = body.toLowerCase();
    const fullText = `${lowerSubject} ${lowerBody}`;

    // 1. Sender Dimension (Weight: 0.45)
    let senderScore = 0.5;
    if (isVip) {
        senderScore = 1.0;
        reasons.push('Sender is marked as VIP');
    } else if (isFrequentContact) {
        senderScore = 0.85;
        reasons.push('Regular conversation partner');
    } else if (lowerFrom.includes('.gov') || lowerFrom.includes('.edu')) {
        senderScore = 0.75;
        reasons.push('Official/Educational domain');
    } else if (lowerFrom.includes('noreply') || lowerFrom.includes('no-reply')) {
        senderScore = 0.3;
        reasons.push('Automated no-reply address');
    }

    // 2. Content/Urgency Dimension (Weight: 0.35)
    let contentScore = 0.5;
    
    // High Priority Match
    const highMatches = HIGH_PRIORITY_KEYWORDS.filter(kw => lowerSubject.includes(kw) || lowerBody.includes(kw));
    if (highMatches.length > 0) {
        contentScore += 0.3 * Math.min(highMatches.length, 3) / 3;
        reasons.push(`High priority keywords detected: ${highMatches.slice(0, 2).join(', ')}`);
    }

    // Urgency Match
    const urgencyHits = URGENCY_TIME_KEYWORDS.filter(regex => regex.test(fullText));
    if (urgencyHits.length > 0) {
        contentScore += 0.2;
        reasons.push('Urgency/Time cues detected');
    }

    // Low Priority Match (Suppression)
    const lowMatches = LOW_PRIORITY_KEYWORDS.filter(kw => lowerSubject.includes(kw));
    if (lowMatches.length > 0) {
        contentScore -= 0.4;
        reasons.push('Subject marks it as low-priority/automated content');
    }

    // 3. Thread/Context Dimension (Weight: 0.2)
    let threadScore = 0.5;
    if (lowerSubject.startsWith('re:') || lowerSubject.startsWith('fwd:')) {
        threadScore = 0.85;
        reasons.push('Existing conversation thread');
    }

    // 4. Structural Dimensions (Interrogatives/Action items)
    if (fullText.includes('?') || fullText.includes('please')) {
        threadScore += 0.1;
        reasons.push('Contains questions or requests');
    }

    // Final weighted calculation
    // Sender (0.45) + Content/Urgency (0.35) + Thread/Context (0.2)
    const score = (senderScore * 0.45) + (contentScore * 0.35) + (threadScore * 0.2);

    // Thresholds
    let priority: Priority = 'MEDIUM';
    if (score > 0.75) priority = 'HIGH';
    else if (score < 0.45) priority = 'LOW';

    return { 
        priority, 
        score: Math.min(Math.max(score, 0), 1),
        reasons 
    };
}
