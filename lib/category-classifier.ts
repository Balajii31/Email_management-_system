
export type EmailCategory = 
  | 'social'           // Social networks, forums, messaging
  | 'transactional'    // Receipts, confirmations, shipping
  | 'jobs'             // Job offers, career opportunities
  | 'events'           // Event invitations, calendar
  | 'personal'         // Personal emails from individuals
  | 'updates'          // Updates, notifications, alerts
  | 'promotional'      // Marketing, newsletters, deals
  | 'inbox';           // Default/uncategorized

interface CategoryKeywords {
  social: string[];
  transactional: string[];
  jobs: string[];
  events: string[];
  personal: string[];
  updates: string[];
  promotional: string[];
}

const CATEGORY_KEYWORDS: CategoryKeywords = {
  social: [
    'facebook', 'twitter', 'linkedin', 'instagram', 'snapchat', 'tiktok',
    'social network', 'friend request', 'follower', 'commented', 'liked',
    'mentioned you', 'tagged you', 'connection request', 'message you',
    'reddit', 'discord', 'slack', 'notification from'
  ],
  transactional: [
    'receipt', 'invoice', 'payment', 'order confirmation', 'shipping',
    'delivered', 'tracking', 'transaction', 'purchase', 'order #',
    'card ending', 'payment received', 'refund', 'subscription',
    'billing', 'statement', 'checkout', 'your order', 'bill'
  ],
  jobs: [
    'job', 'career', 'hiring', 'opportunity', 'position', 'apply',
    'interview', 'resume', 'cv', 'recruiter', 'employment',
    'job alert', 'candidate', 'application', 'workplace', 'offer letter',
    'software engineer', 'developer', 'full stack', 'vacancy', 'talent'
  ],
  events: [
    'event', 'invitation', 'invite', 'calendar', 'meeting', 'rsvp',
    'schedule', 'webinar', 'conference', 'seminar', 'workshop',
    'join us', 'save the date', 'upcoming', 'register now', 'attendance',
    'zoom', 'google meet', 'microsoft teams', 'location'
  ],
  personal: [
    'from:', 'dear', 'hi', 'hello', 'regards', 'best wishes',
    'yours', 'sincerely', 'hope you', 'how are you', 'wanted to reach out',
    'thought you might like', 'quick question'
  ],
  updates: [
    'update', 'notification', 'alert', 'reminder', 'news',
    'announcement', 'release', 'version', 'security alert',
    'password reset', 'verify', 'confirm your', 'action required',
    'account activity', 'new feature', 'changelog', 'policy update'
  ],
  promotional: [
    'sale', 'discount', 'offer', 'deal', 'coupon', 'promo',
    'limited time', 'exclusive', 'save', 'free shipping',
    'unsubscribe', 'newsletter', 'weekly', 'special offer',
    '% off', 'buy now', 'shop now', 'marketing', 'advertisement',
    'sponsored', 'exclusive deal', 'best price', 'savings'
  ]
};

const SENDER_PATTERNS: Record<string, EmailCategory> = {
  // Social
  'facebook.com': 'social',
  'facebookmail.com': 'social',
  'twitter.com': 'social',
  'linkedin.com': 'social',
  'instagram.com': 'social',
  'reddit.com': 'social',
  'discord.com': 'social',
  'github.com/notifications': 'social',
  
  // Transactional
  'amazon.com': 'transactional',
  'paypal.com': 'transactional',
  'stripe.com': 'transactional',
  'uber.com': 'transactional',
  'swiggy.in': 'transactional',
  'zomato.com': 'transactional',
  'netpay.com': 'transactional',
  
  // Jobs
  'indeed.com': 'jobs',
  'naukri.com': 'jobs',
  'linkedin.com/jobs': 'jobs',
  'glassdoor.com': 'jobs',
  'unstop.com': 'jobs',
  'internshala.com': 'jobs',
  'hire.com': 'jobs',
  
  // Updates
  'github.com': 'updates',
  'gitlab.com': 'updates',
  'notifications@': 'updates',
  'noreply@': 'updates',
  'security-noreply': 'updates',
  'alerts@': 'updates',
};

export function classifyEmailCategory(
  from: string,
  subject: string,
  body: string
): EmailCategory {
  const lowerFrom = from.toLowerCase();
  const lowerSubject = subject.toLowerCase();
  const lowerBody = body.toLowerCase().substring(0, 1000); // More context for scoring
  const combinedText = `${lowerSubject} ${lowerBody}`;

  // Priority 1: Check known sender patterns first
  for (const [pattern, category] of Object.entries(SENDER_PATTERNS)) {
    if (lowerFrom.includes(pattern)) {
      return category;
    }
  }

  // Priority 2: Score categories based on keyword weighting
  const scores: Record<EmailCategory, number> = {
    social: 0,
    transactional: 0,
    jobs: 0,
    events: 0,
    personal: 0,
    updates: 0,
    promotional: 0,
    inbox: 0
  };

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const cat = category as EmailCategory;
    let score = 0;
    
    for (const keyword of keywords) {
      if (lowerSubject.includes(keyword)) {
        score += 5; // Strong subject match
      }
      if (lowerBody.includes(keyword)) {
        score += 2; // Medium body match
      }
    }
    scores[cat] = score;
  }

  // Special heuristics
  
  // If no category matched well, but it's a person
  const looksPersonal = !lowerFrom.includes('noreply') && 
                        !lowerFrom.includes('no-reply') &&
                        !lowerFrom.includes('automated') &&
                        !lowerFrom.includes('notifications') &&
                        !lowerFrom.includes('@google.com') && // Exceptions
                        !lowerFrom.includes('@microsoft.com');

  if (Object.values(scores).every(s => s < 2)) {
    return looksPersonal ? 'personal' : 'inbox';
  }

  // Find max score
  let maxScore = 0;
  let bestCategory: EmailCategory = 'inbox';
  
  for (const [category, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestCategory = category as EmailCategory;
    }
  }

  // "Tie breaker" — if promotional and updates are close, promotional often wins
  if (bestCategory === 'updates' && scores.promotional >= scores.updates - 2) {
    return 'promotional';
  }

  return bestCategory;
}

export function getCategoryDisplayName(category: EmailCategory): string {
  const names: Record<EmailCategory, string> = {
    social: 'Social',
    transactional: 'Transactional',
    jobs: 'Jobs',
    events: 'Events',
    personal: 'Personal',
    updates: 'Updates',
    promotional: 'Promotional',
    inbox: 'Inbox'
  };
  return names[category];
}
