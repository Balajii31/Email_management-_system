-- CreateTable User
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_email_key" UNIQUE ("email")
);

-- CreateTable Email
CREATE TABLE IF NOT EXISTS "Email" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT[] NOT NULL,
    "cc" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "bcc" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "summary" TEXT,
    "translated" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "isSpam" BOOLEAN NOT NULL DEFAULT false,
    "isDraft" BOOLEAN NOT NULL DEFAULT false,
    "folder" TEXT NOT NULL DEFAULT 'inbox',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Email_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
);

-- CreateTable Attachment
CREATE TABLE IF NOT EXISTS "Attachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "emailId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attachment_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "Email" ("id") ON DELETE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Email_userId_idx" ON "Email"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Email_folder_idx" ON "Email"("folder");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Email_priority_idx" ON "Email"("priority");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Attachment_emailId_idx" ON "Attachment"("emailId");

-- Insert sample user
INSERT INTO "User" ("id", "email", "name", "avatar", "updatedAt")
VALUES (
    'user_1',
    'john@example.com',
    'John Doe',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
    CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

-- Insert sample emails
INSERT INTO "Email" ("id", "userId", "from", "to", "subject", "body", "priority", "folder", "updatedAt")
VALUES 
(
    'email_1',
    'user_1',
    'alice@example.com',
    ARRAY['john@example.com'],
    'Project Update - Urgent',
    'Hi John, Please review the latest project update. We need your approval by EOD today. The team has completed the initial phase and is ready for your feedback.',
    'high',
    'inbox',
    CURRENT_TIMESTAMP
),
(
    'email_2',
    'user_1',
    'bob@example.com',
    ARRAY['john@example.com'],
    'Team Meeting - Tomorrow at 10 AM',
    'Hey John, Just a reminder about our team meeting tomorrow at 10 AM. We will discuss Q1 goals and project roadmap. Please come prepared with your updates.',
    'medium',
    'inbox',
    CURRENT_TIMESTAMP
),
(
    'email_3',
    'user_1',
    'carol@example.com',
    ARRAY['john@example.com'],
    'Design Review Feedback',
    'Hi John, I have reviewed the design mockups. Overall looks good! Just a few minor adjustments needed on the header section. Let me know if you want to discuss further.',
    'medium',
    'inbox',
    CURRENT_TIMESTAMP
),
(
    'email_4',
    'user_1',
    'dave@example.com',
    ARRAY['john@example.com'],
    'System Maintenance Alert',
    'This is an automated notification about scheduled system maintenance on Sunday from 2 AM to 4 AM. Services may be unavailable during this time.',
    'low',
    'inbox',
    CURRENT_TIMESTAMP
),
(
    'email_5',
    'user_1',
    'eve@example.com',
    ARRAY['john@example.com'],
    'Lunch Plans This Friday?',
    'Hey John! A few of us are planning to grab lunch this Friday. Interested? Let me know your availability.',
    'low',
    'inbox',
    CURRENT_TIMESTAMP
)
ON CONFLICT DO NOTHING;
