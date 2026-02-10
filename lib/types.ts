export type EmailFolder = 'inbox' | 'spam' | 'sent' | 'drafts' | 'settings'
export type Priority = 'high' | 'medium' | 'low'

export interface Email {
  id: string
  userId: string
  googleMessageId?: string
  googleThreadId?: string
  from: string
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  body: string
  priority: Priority
  isRead: boolean
  isArchived: boolean
  isSpam: boolean
  isDraft: boolean
  folder: string
  createdAt: string | Date
  updatedAt: string | Date
  deletedAt?: string | Date
  attachments?: Attachment[]
  summaries?: EmailSummary[]
  translations?: EmailTranslation[]
}

export interface EmailSummary {
  id: string
  emailId: string
  content: string
  createdAt: string | Date
}

export interface EmailTranslation {
  id: string
  emailId: string
  targetLanguage: string
  content: string
  createdAt: string | Date
}

export interface Attachment {
  id: string
  emailId: string
  filename: string
  url: string
  size: number
  mimeType: string
  createdAt: string | Date
}
