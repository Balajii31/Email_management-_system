
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-me';

export function encryptToken(token: string): string {
    return CryptoJS.AES.encrypt(token, ENCRYPTION_KEY).toString();
}

export function decryptToken(encryptedToken: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedToken, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
}

export function isTokenExpired(expiresAt: Date | string | null): boolean {
    if (!expiresAt) return true;
    const expiry = new Date(expiresAt).getTime();
    const now = new Date().getTime();
    // Buffer of 5 minutes
    return now + 300000 > expiry;
}
