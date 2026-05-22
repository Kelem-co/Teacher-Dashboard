// Feature: backend-integration-refactor, Property 8: Message send round-trip
// Validates: Requirements 7.3, 7.6

import * as fc from 'fast-check';
import {
  getThreads,
  sendMessage,
  markThreadRead,
  _resetMockStore,
} from '../messagesService';

const THREAD_IDS = ['THR-001', 'THR-002', 'THR-003', 'THR-004', 'THR-005'] as const;

/**
 * **Validates: Requirements 7.3, 7.6**
 *
 * Property 8: Message send round-trip
 * For any threadId and message text, calling sendMessage(threadId, text) followed
 * by getThreads() should return the thread where the last message contains the
 * sent text.
 */
describe('messagesService — Property 8: Message send round-trip', () => {
  beforeEach(() => {
    _resetMockStore();
  });

  it(
    'getThreads() after sendMessage(threadId, …) returns the thread where the last message contains the sent text',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(
            fc.constantFrom(...THREAD_IDS),
            fc.string({ minLength: 1 })
          ),
          async ([threadId, text]) => {
            // Reset store before each iteration for independence
            _resetMockStore();

            await sendMessage(threadId, {
              sender: 'teacher',
              text,
              time: new Date().toISOString(),
            });

            const threads = await getThreads();
            const thread = threads.find((t) => t.id === threadId);

            // Thread must exist
            if (!thread) return false;

            // The last message must contain the sent text
            const lastMessage = thread.messages[thread.messages.length - 1];
            if (!lastMessage) return false;

            return lastMessage.text === text;
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});

// Feature: backend-integration-refactor, Property 9: Mark thread read
// Validates: Requirements 7.4

/**
 * **Validates: Requirements 7.4**
 *
 * Property 9: Mark thread read
 * For any thread ID, calling markThreadRead(threadId) followed by getThreads()
 * should return the thread with unread === false.
 */
describe('messagesService — Property 9: Mark thread read', () => {
  beforeEach(() => {
    _resetMockStore();
  });

  it(
    'getThreads() after markThreadRead(threadId) returns the thread with unread === false',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...THREAD_IDS),
          async (threadId) => {
            // Reset store before each iteration for independence
            _resetMockStore();

            await markThreadRead(threadId);

            const threads = await getThreads();
            const thread = threads.find((t) => t.id === threadId);

            // Thread must exist and be marked as read
            if (!thread) return false;

            return thread.unread === false;
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});
