# AI-Powered Email Management System

A high-performance, AI-driven email client built with Next.js, featuring automated summarization, translation, and priority classification.

## 🚀 Features

- **Virtualized Inbox**: Smooth scrolling through thousands of emails using `@tanstack/react-virtual`.
- **AI Summarization**: Get concise summaries of long emails using Google Gemini.
- **Tamil Translation**: One-click translation of emails into Tamil.
- **Smart Classification**: Automatic spam detection and priority categorization.
- **Gmail Integration**: Secure connection and synchronization with Gmail.
- **Secure by Default**: AES-256-GCM token encryption, CSP headers, and rate limiting.

## 🛠️ Tech Stack

- **Frontend**: Next.js 16 (App Router), Tailwind CSS, Shadcn UI.
- **Backend**: Next.js API Routes, Prisma ORM.
- **Database**: PostgreSQL (Supabase).
- **Authentication**: Supabase Auth (SSR).
- **AI**: Google Generative AI (Gemini).
- **Testing**: Jest, React Testing Library, Playwright.

## 🏁 Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- Supabase Project
- Google AI (Gemini) API Key

### Installation

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd email-management-system
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Setup environment variables:
   ```bash
   cp .env.example .env.local
   # Fill in your values in .env.local
   ```

4. Database setup:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. Run the development server:
   ```bash
   pnpm dev
   ```

## 🧪 Testing

- **Unit/Integration Tests**: `pnpm test`
- **E2E Tests**: `pnpm test:e2e`
- **Coverage**: `pnpm test:coverage`

## 🔒 Security

- **Encryption**: Tokens are encrypted using `lib/crypto.ts` with AES-256-GCM.
- **CSP**: Content Security Policy is configured in `next.config.mjs`.
- **Sanitization**: Email content is sanitized using `DOMPurify` before rendering.
- **Rate Limiting**: Implemented in `middleware.ts` to prevent abuse.

## 📄 License

MIT
