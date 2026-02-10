
import { Email } from './types'

export const MOCK_EMAILS: any[] = [
    {
        id: 'email_1',
        from: 'alice@example.com',
        subject: 'Project Update - Urgent',
        body: 'Hi John, Please review the latest project update. We need your approval by EOD today. The team has completed the initial phase and is ready for your feedback.',
        timestamp: new Date().toISOString(),
        read: false,
        priority: 'HIGH',
        folder: 'inbox',
        attachments: []
    },
    {
        id: 'email_2',
        from: 'bob@example.com',
        subject: 'Team Meeting - Tomorrow at 10 AM',
        body: 'Hey John, Just a reminder about our team meeting tomorrow at 10 AM. We will discuss Q1 goals and project roadmap. Please come prepared with your updates.',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        read: true,
        priority: 'MEDIUM',
        folder: 'inbox',
        attachments: []
    },
    {
        id: 'email_3',
        from: 'carol@example.com',
        subject: 'Design Review Feedback',
        body: 'Hi John, I have reviewed the design mockups. Overall looks good! Just a few minor adjustments needed on the header section. Let me know if you want to discuss further.',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        read: false,
        priority: 'MEDIUM',
        folder: 'inbox',
        attachments: []
    },
    {
        id: 'email_4',
        from: 'dave@example.com',
        subject: 'System Maintenance Alert',
        body: 'This is an automated notification about scheduled system maintenance on Sunday from 2 AM to 4 AM. Services may be unavailable during this time.',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        read: true,
        priority: 'LOW',
        folder: 'inbox',
        attachments: []
    },
    {
        id: 'email_5',
        from: 'eve@example.com',
        subject: 'Lunch Plans This Friday?',
        body: 'Hey John! A few of us are planning to grab lunch this Friday. Interested? Let me know your availability.',
        timestamp: new Date(Date.now() - 172800000).toISOString(),
        read: true,
        priority: 'LOW',
        folder: 'inbox',
        attachments: []
    }
]
