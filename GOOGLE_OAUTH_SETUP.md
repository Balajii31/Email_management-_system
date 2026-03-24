# Google OAuth Setup Guide

## Problem: "Access blocked: This app's request is invalid"

This error occurs when the redirect URI in your app doesn't match what's configured in Google Cloud Console.

## ✅ Solution

### Step 1: Add Redirect URIs to Google Cloud Console

1. Go to [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)

2. Select your project (if prompted)

3. Click on your **OAuth 2.0 Client ID** (it should show your GOOGLE_CLIENT_ID)

4. Under **"Authorized redirect URIs"**, add these three URIs:

   ```
   http://localhost:3000/api/auth/gmail-callback
   http://localhost:3000/auth/callback
   https://flqzjgkieojwefwuxkvb.supabase.co/auth/v1/callback
   ```

5. Click **"SAVE"** at the bottom

### Step 2: Verify .env File

Your `.env` file should have:

```env
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/gmail-callback"
```

✅ This has been added for you.

### Step 3: Enable Required APIs

Make sure these APIs are enabled in Google Cloud Console:

1. Go to [API Library](https://console.cloud.google.com/apis/library)

2. Search and enable:
   - **Gmail API**
   - **Google+ API** (or People API)
   - **Google OAuth2 API**

### Step 4: Configure OAuth Consent Screen

1. Go to [OAuth Consent Screen](https://console.cloud.google.com/apis/credentials/consent)

2. If in "Testing" mode, add your test Gmail account to "Test users"

3. Required scopes (should already be there):
   - `userinfo.email`
   - `userinfo.profile`
   - `gmail.readonly`
   - `gmail.modify`

### Step 5: Restart Application

After making changes in Google Cloud Console:

**Option A: Use the restart script**
```bash
.\restart-system.bat
```

**Option B: Manual restart**
1. Stop current services (Ctrl+C in terminals)
2. Start BERT server: `npm run ml:serve`
3. Start Next.js: `npm run dev`

### Step 6: Test the Login

1. Open http://localhost:3000
2. Click "Sign in with Google"
3. You should see the Google consent screen
4. Accept permissions
5. You'll be redirected back to your app

## Common Issues

### Issue: "redirect_uri_mismatch"
**Solution:** Double-check that the redirect URI in Google Cloud Console exactly matches:
```
http://localhost:3000/api/auth/gmail-callback
```
(No trailing slash, exact match)

### Issue: "This app isn't verified"
**Solution:** 
- Click "Advanced" → "Go to [your app] (unsafe)"
- OR add your email to Test Users in OAuth Consent Screen

### Issue: "Access denied"
**Solution:**
- Make sure you're using the Gmail account added to Test Users
- Check that all required scopes are configured

### Issue: Still getting errors after configuration
**Solution:**
1. Clear browser cache and cookies
2. Try incognito/private mode
3. Wait 1-2 minutes for Google changes to propagate
4. Restart both servers

## For Production Deployment

When deploying to production (e.g., Vercel), add this redirect URI:

```
https://yourdomain.com/api/auth/gmail-callback
```

And update the `GOOGLE_REDIRECT_URI` in your production environment variables.

## Need Help?

If you're still having issues:

1. Check browser console for errors (F12)
2. Check Next.js terminal for error messages
3. Verify all redirect URIs are saved in Google Cloud Console
4. Make sure you're logged into the correct Google account

---

**Quick Links:**
- [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)
- [OAuth Consent Screen](https://console.cloud.google.com/apis/credentials/consent)
- [API Library](https://console.cloud.google.com/apis/library)
