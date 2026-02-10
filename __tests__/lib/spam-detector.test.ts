import { detectSpam, extractFeatures } from '../../lib/spam-detector';

describe('Spam Detector', () => {
  it('should correctly classify obvious spam', () => {
    const from = 'spam@example.com';
    const subject = 'FREE WINNER URGENT CLICK HERE!!!';
    const body = 'You have won a lottery! Click here now to claim your prize: http://scam.com/win';
    
    const features = extractFeatures(from, subject, body);
    const result = detectSpam(features);
    
    expect(result.isSpam).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  it('should correctly classify obvious ham', () => {
    const from = 'boss@company.com';
    const subject = 'Meeting reschedule';
    const body = 'Hi team, let us meet at 2pm instead of 10am tomorrow to discuss the project update.';
    
    const features = extractFeatures(from, subject, body);
    const result = detectSpam(features);
    
    expect(result.isSpam).toBe(false);
  });

  it('should detect high caps in subject as suspicious', () => {
    const from = 'marketing@sale.com';
    const subject = 'BUY NOW OR MISS OUT';
    const body = 'Limited time offer on all our products.';
    
    const features = extractFeatures(from, subject, body);
    // Even if Bayes doesn't catch it, heuristics should increase the score
    expect(features.capsInSubject).toBeGreaterThan(0.5);
  });
});
