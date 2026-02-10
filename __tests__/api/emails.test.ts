// Mocking prisma and supabase
jest.mock('../../lib/prisma', () => ({
  email: {
    findMany: jest.fn(),
  },
}));

jest.mock('../../lib/supabase', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(() => ({
        data: { user: { id: 'test-user-id' } },
        error: null,
      })),
    },
  })),
}));

import { GET } from '../../app/api/emails/route';
import prisma from '../../lib/prisma';
import { NextRequest } from 'next/server';

describe('Emails API', () => {
  it('should return a list of emails', async () => {
    const mockEmails = [
      { id: '1', subject: 'Test 1', from: 'sender1@test.com' },
      { id: '2', subject: 'Test 2', from: 'sender2@test.com' },
    ];

    (prisma.email.findMany as jest.Mock).mockResolvedValue(mockEmails);

    const req = new NextRequest('http://localhost:3000/api/emails?folder=inbox');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.emails).toHaveLength(2);
    expect(data.emails[0].subject).toBe('Test 1');
  });

  it('should handle unauthorized requests', async () => {
    const { createClient } = require('../../lib/supabase');
    createClient.mockReturnValueOnce({
      auth: {
        getUser: jest.fn(() => ({
          data: { user: null },
          error: new Error('Unauthorized'),
        })),
      },
    });

    const req = new NextRequest('http://localhost:3000/api/emails');
    const response = await GET(req);

    expect(response.status).toBe(401);
  });
});
