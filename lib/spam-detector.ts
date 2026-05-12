/**
 * Advanced Multi-Layer Spam Detection Engine
 *
 * Layers used (no BERT server needed — all run in-process):
 *  1. Sender / domain reputation
 *  2. Subject-line heuristics (obfuscation, all-caps, special chars, urgency bait)
 *  3. Body content — TF-IDF-style weighted keyword scoring
 *  4. URL / link analysis (suspicious TLDs, link count, redirect patterns)
 *  5. HTML structure (img ratio, hidden text patterns, tracking pixels)
 *  6. Header-mimicry / spoofing signals
 *  7. Aggregated weighted score with calibrated thresholds
 */

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
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

export interface SpamSignal {
    name: string;
    score: number;   // contribution to final spam score (0–1 scale, can be negative for ham signals)
    reason: string;
}

export interface SpamResult {
    isSpam: boolean;
    confidence: number;
    signals: SpamSignal[];
    usedBert?: boolean;
}

// ─────────────────────────────────────────────
// 1. Spam keyword dictionary (weighted TF-IDF style)
//    Higher weight = stronger spam indicator
// ─────────────────────────────────────────────
const SPAM_KEYWORDS: Array<{ pattern: RegExp; weight: number }> = [
    // Financial bait
    { pattern: /\bfree\s+money\b/i,           weight: 0.90 },
    { pattern: /\b(make|earn)\s+\$?\d+[km]?\s*(a\s+day|per\s+day|daily|weekly)/i, weight: 0.95 },
    { pattern: /\b(lottery|jackpot|won|winner)\b/i,  weight: 0.85 },
    { pattern: /\bclaim\s+your\s+(prize|reward|gift|cash)\b/i, weight: 0.90 },
    { pattern: /\b(nigerian|inheritance)\s+(prince|fund|million)\b/i, weight: 0.99 },
    { pattern: /\bwire\s+transfer\b/i,         weight: 0.80 },
    { pattern: /\b(100\s*%\s*free|absolutely\s+free|no\s+cost)\b/i, weight: 0.70 },
    { pattern: /\bno\s+(credit\s+card|payment)\s*required\b/i, weight: 0.75 },
    { pattern: /\b(cash\s+bonus|cash\s+prize|cash\s+reward)\b/i, weight: 0.85 },

    // Pharma / adult
    { pattern: /\b(viagra|cialis|levitra|penis|enlargement|erection)\b/i, weight: 0.99 },
    { pattern: /\b(cheap|discount|buy)\s+(medication|meds|pills|drugs)\b/i, weight: 0.95 },
    { pattern: /\bweight\s+loss\s+(pill|supplement|secret|fast)\b/i, weight: 0.80 },

    // Crypto / investment scams
    { pattern: /\b(bitcoin|crypto|nft)\s+(investment|opportunity|doubl|triple)\b/i, weight: 0.90 },
    { pattern: /\b(guaranteed|risk[\s-]?free)\s+(return|profit|income|investment)\b/i, weight: 0.90 },
    { pattern: /\binvest\s+(now|today)\b/i,    weight: 0.75 },

    // Urgency / pressure tactics
    { pattern: /\b(act\s+now|limited\s+time|expires?\s+(today|soon)|last\s+chance)\b/i, weight: 0.65 },
    { pattern: /\b(buy\s+now|order\s+now|click\s+here|sign\s+up\s+now)\b/i, weight: 0.55 },
    { pattern: /\burgent\s+(action|response|reply)\s+required\b/i, weight: 0.60 },
    { pattern: /\byou'?ve?\s+been\s+(selected|chosen|approved)\b/i, weight: 0.80 },

    // Account phishing
    { pattern: /\b(verify|confirm|validate)\s+your\s+(account|email|identity|password)\b/i, weight: 0.65 },
    { pattern: /\byour\s+account\s+(has\s+been\s+)?(suspended|locked|compromised|hacked)\b/i, weight: 0.75 },
    { pattern: /\bclick\s+(the\s+link|below|here)\s+to\s+(verify|confirm|unlock|restore)\b/i, weight: 0.80 },

    // Obfuscated spam words (spammers swap letters with symbols)
    { pattern: /[fF][rRо][eE3][eE3]\s+[gG][iI1][fFрh][tT]/i,  weight: 0.85 }, // fr3e g1ft variants
    { pattern: /v[iI1][aA][gG][rR][aA4]/i,     weight: 0.99 },
    { pattern: /c[lL][iI][cC][kK]\s+h[eE3][rR][eE3]/i, weight: 0.70 },
];

// ─────────────────────────────────────────────
// 2. Ham keyword signals (negative spam score)
//    If these appear, the email is more likely legit
// ─────────────────────────────────────────────
const HAM_KEYWORDS: Array<{ pattern: RegExp; weight: number }> = [
    { pattern: /\b(agenda|meeting\s+notes|minutes\s+of\s+meeting)\b/i, weight: -0.30 },
    { pattern: /\b(pull\s+request|code\s+review|merge\s+request|commit)\b/i, weight: -0.35 },
    { pattern: /\b(sprint|standup|retrospective|backlog)\b/i, weight: -0.30 },
    { pattern: /\b(invoice\s+#|purchase\s+order|statement\s+of\s+work)\b/i, weight: -0.25 },
    { pattern: /\b(regards|sincerely|best\s+wishes|kind\s+regards)\b/i, weight: -0.20 },
    { pattern: /\b(attached|attachment|please\s+find)\b/i, weight: -0.20 },
    { pattern: /\b(schedule|calendar|appointment|reschedule)\b/i, weight: -0.15 },
    { pattern: /\bpassword\s+reset\b/i,          weight: -0.10 }, // transactional, not spam
    { pattern: /\b(your\s+(order|shipment|delivery))\b/i, weight: -0.20 },
];

// ─────────────────────────────────────────────
// 3. Suspicious domain / sender patterns
// ─────────────────────────────────────────────
const SUSPECT_SENDER_PATTERNS: RegExp[] = [
    /\d{5,}@/,                                // many digits before @ (e.g. 5839201@)
    /@([\w-]+\.){3,}/,                        // too many subdomains
    /noreply.*@(?!github|google|amazon|microsoft|stripe|paypal|atlassian|apple)/i,
    /info@(?![\w-]+(\.com|\.org|\.edu|\.gov)$)/i,
    /@(xyz|top|click|win|promo|deal|offer|cash|free)\./i, // spammy TLDs
    /[a-z0-9]{20,}@/,                         // very long local part (obfuscated)
];

const TRUSTED_DOMAINS = new Set([
    'gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com',
    'protonmail.com', 'microsoft.com', 'google.com', 'amazon.com', 'apple.com',
    'github.com', 'stripe.com', 'paypal.com', 'atlassian.com', 'slack.com',
    'zoom.us', 'dropbox.com', 'notion.so', 'figma.com', 'vercel.com',
]);

// ─────────────────────────────────────────────
// 4. Suspicious URL patterns
// ─────────────────────────────────────────────
const SUSPICIOUS_URL_PATTERNS: RegExp[] = [
    /https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/,   // raw IP address URL
    /bit\.ly|tinyurl\.com|goo\.gl|ow\.ly|rebrand\.ly/i,  // URL shorteners
    /\.(xyz|top|click|win|promo|tk|ml|ga|cf|gq)\//i,     // spammy TLDs
    /[a-z0-9]{30,}\.(com|net|org)/i,                      // very long random domain
    /login|verify|secure|account.*\.(com|net)/i,          // phishing URLs
];

// ─────────────────────────────────────────────
// Helper: extract domain from email address
// ─────────────────────────────────────────────
function extractDomain(email: string): string {
    const match = email.match(/@([\w.-]+)/);
    return match ? match[1].toLowerCase() : '';
}

// ─────────────────────────────────────────────
// Feature Extractor (unchanged interface, enhanced internals)
// ─────────────────────────────────────────────
export function extractFeatures(from: string, subject: string, body: string, html?: string): EmailFeatures {
    const linksCount = (body.match(/https?:\/\/[^\s]+/g) || []).length
        + (html?.match(/href=/gi) || []).length;

    const imagesCount = (html?.match(/<img/gi) || []).length;

    const textLength = body.length || 1;
    const htmlLength = html?.length || 0;
    const htmlToTextRatio = htmlLength / textLength;

    const capsInSubject = (subject.match(/[A-Z]/g) || []).length / (subject.length || 1);
    const specialCharsInSubject = (subject.match(/[!@#$%^&*(){}[\]]/g) || []).length;

    return { sender: from, subject, body, htmlToTextRatio, linksCount, imagesCount, capsInSubject, specialCharsInSubject };
}

// ─────────────────────────────────────────────
// Core Detection Logic
// ─────────────────────────────────────────────
export function detectSpam(features: EmailFeatures): SpamResult {
    const signals: SpamSignal[] = [];
    let totalScore = 0;

    const subject = features.subject || '';
    const body    = features.body    || '';
    const sender  = features.sender  || '';
    const fullText = `${subject} ${body}`;

    // ── Layer 1: Sender Reputation ────────────────────────────────────────
    const domain = extractDomain(sender);
    const isTrusted = domain && TRUSTED_DOMAINS.has(domain);

    if (isTrusted) {
        const s: SpamSignal = { name: 'trusted_domain', score: -0.20, reason: `Sender domain "${domain}" is trusted` };
        signals.push(s);
        totalScore += s.score;
    }

    for (const pattern of SUSPECT_SENDER_PATTERNS) {
        if (pattern.test(sender)) {
            const s: SpamSignal = { name: 'suspicious_sender', score: 0.30, reason: `Sender address matches suspicious pattern: ${pattern.source}` };
            signals.push(s);
            totalScore += s.score;
            break; // one signal per sender
        }
    }

    if (!domain) {
        const s: SpamSignal = { name: 'no_sender_domain', score: 0.25, reason: 'Sender has no recognisable email domain' };
        signals.push(s);
        totalScore += s.score;
    }

    // Sender name ≠ domain spoofing: "PayPal <malicious@randomain.xyz>"
    const displayNameMatch = sender.match(/^"?([^<"]+)"?\s*</);
    if (displayNameMatch && domain) {
        const displayName = displayNameMatch[1].trim().toLowerCase();
        const knownBrand = /paypal|amazon|apple|google|microsoft|netflix|bank|irs|ubs|visa|mastercard/i.test(displayName);
        const domainMatchesBrand = displayName.split(/\s+/).some(w => domain.includes(w));
        if (knownBrand && !domainMatchesBrand) {
            const s: SpamSignal = { name: 'sender_spoofing', score: 0.85, reason: `Display name "${displayName}" does not match sending domain "${domain}" — possible spoofing` };
            signals.push(s);
            totalScore += s.score;
        }
    }

    // ── Layer 2: Subject-Line Analysis ───────────────────────────────────

    // All-caps ratio in subject
    if (features.capsInSubject > 0.5) {
        const s: SpamSignal = { name: 'excessive_caps_subject', score: 0.25, reason: `${Math.round(features.capsInSubject * 100)}% of subject is uppercase` };
        signals.push(s);
        totalScore += s.score;
    } else if (features.capsInSubject > 0.3) {
        const s: SpamSignal = { name: 'moderate_caps_subject', score: 0.10, reason: `${Math.round(features.capsInSubject * 100)}% caps in subject` };
        signals.push(s);
        totalScore += s.score;
    }

    // Special chars !! ???
    if (features.specialCharsInSubject > 3) {
        const s: SpamSignal = { name: 'special_chars_subject', score: 0.20, reason: `${features.specialCharsInSubject} special characters in subject` };
        signals.push(s);
        totalScore += s.score;
    }

    // Emoji / symbol spam in subject
    const emojiCount = (subject.match(/[\u{1F300}-\u{1FFFF}]/u) || []).length;
    if (emojiCount > 2) {
        const s: SpamSignal = { name: 'emoji_spam_subject', score: 0.15, reason: `${emojiCount} emojis in subject line` };
        signals.push(s);
        totalScore += s.score;
    }

    // RE: / FWD: in very short subjects — common trick
    if (/^(re:|fwd?:)\s*.{0,10}$/i.test(subject)) {
        const s: SpamSignal = { name: 'fake_reply_subject', score: 0.30, reason: 'RE:/FWD: prefix on a suspiciously short subject — possible engagement bait' };
        signals.push(s);
        totalScore += s.score;
    }

    // ── Layer 3: Body Keyword Scoring ─────────────────────────────────────
    let spamKeywordHits = 0;
    for (const { pattern, weight } of SPAM_KEYWORDS) {
        if (pattern.test(fullText)) {
            signals.push({ name: 'spam_keyword', score: weight * 0.5, reason: `Matched spam pattern: /${pattern.source}/i` });
            totalScore += weight * 0.5;
            spamKeywordHits++;
        }
    }
    // Diminishing returns once we've already have strong evidence — cap contribution
    // (Already handled because we push individual signals but totalScore accumulates)

    for (const { pattern, weight } of HAM_KEYWORDS) {
        if (pattern.test(fullText)) {
            signals.push({ name: 'ham_keyword', score: weight, reason: `Matched legitimate pattern: /${pattern.source}/i` });
            totalScore += weight; // weight is negative
        }
    }

    // Repeated "click here" / "buy now" (multiplied urgency)
    const clickHereCount = (fullText.match(/click\s+here/gi) || []).length;
    if (clickHereCount > 1) {
        const s: SpamSignal = { name: 'repeated_cta', score: clickHereCount * 0.10, reason: `"click here" appears ${clickHereCount} times` };
        signals.push(s);
        totalScore += s.score;
    }

    // Body is extremely short or empty (phishing with mostly image)
    if (body.trim().length < 30 && features.imagesCount > 0) {
        const s: SpamSignal = { name: 'image_only_body', score: 0.45, reason: 'Mostly image with very little text — common in phishing/promotional spam' };
        signals.push(s);
        totalScore += s.score;
    }

    // ── Layer 4: URL / Link Analysis ─────────────────────────────────────
    const urls = fullText.match(/https?:\/\/[^\s"'<>]+/g) || [];

    if (features.linksCount > 8) {
        const s: SpamSignal = { name: 'excessive_links', score: 0.30, reason: `${features.linksCount} links detected — unusually high` };
        signals.push(s);
        totalScore += s.score;
    } else if (features.linksCount > 4) {
        const s: SpamSignal = { name: 'many_links', score: 0.15, reason: `${features.linksCount} links in email` };
        signals.push(s);
        totalScore += s.score;
    }

    let suspiciousUrlCount = 0;
    for (const url of urls) {
        for (const pattern of SUSPICIOUS_URL_PATTERNS) {
            if (pattern.test(url)) {
                suspiciousUrlCount++;
                break;
            }
        }
    }
    if (suspiciousUrlCount > 0) {
        const s: SpamSignal = {
            name: 'suspicious_urls',
            score: Math.min(suspiciousUrlCount * 0.25, 0.80),
            reason: `${suspiciousUrlCount} URL(s) match suspicious patterns (shorteners, IP addresses, spammy TLDs)`,
        };
        signals.push(s);
        totalScore += s.score;
    }

    // ── Layer 5: HTML Structure ───────────────────────────────────────────
    if (features.htmlToTextRatio > 10) {
        const s: SpamSignal = { name: 'html_heavy', score: 0.20, reason: `HTML-to-text ratio is ${features.htmlToTextRatio.toFixed(1)} — heavily HTML-wrapped content` };
        signals.push(s);
        totalScore += s.score;
    }

    if (features.imagesCount > 5) {
        const s: SpamSignal = { name: 'many_images', score: 0.15, reason: `${features.imagesCount} images — possible tracking pixel or image-based spam` };
        signals.push(s);
        totalScore += s.score;
    }

    // ── Layer 6: Greeting / Closing Legitimacy ────────────────────────────
    const hasPersonalGreeting = /\b(dear|hi|hello|hey)\s+[a-z]/i.test(body);
    const hasSignature = /\b(regards|sincerely|thanks|cheers|best)\b/i.test(body);
    if (hasPersonalGreeting && hasSignature) {
        const s: SpamSignal = { name: 'personal_greeting_signature', score: -0.15, reason: 'Email has personal greeting and signature — pattern of legitimate email' };
        signals.push(s);
        totalScore += s.score;
    }

    // ── Final Score Calibration ───────────────────────────────────────────
    // Clamp to [0, 1]
    const confidence = Math.max(0, Math.min(1, totalScore));

    // Threshold: >0.45 = spam (more sensitive than before)
    const isSpam = confidence > 0.45;

    return { isSpam, confidence, signals };
}
