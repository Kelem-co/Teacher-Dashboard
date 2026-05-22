// Feature: backend-integration-refactor, Property 2: ApiError shape on HTTP failure
// Validates: Requirements 1.6

import * as fc from 'fast-check';
import { ApiError, request } from '../apiClient';

/**
 * Property 2: ApiError shape on HTTP failure
 *
 * For any HTTP error status code (4xx or 5xx), when the apiClient encounters
 * that error in real mode, it should throw an ApiError whose `status` field
 * equals the HTTP status code and whose `message` field is a non-empty string.
 *
 * Validates: Requirements 1.6
 */
describe('apiClient — Property 2: ApiError shape on HTTP failure', () => {
  const TEST_BASE_URL = 'http://test.example.com';

  // Ensure global.fetch exists so jest.spyOn can attach to it
  const originalFetch = global.fetch;

  beforeEach(() => {
    // Set the env var so apiClient runs in real mode (not mock mode)
    process.env.NEXT_PUBLIC_API_BASE_URL = TEST_BASE_URL;
    // Provide a no-op fetch stub if the environment doesn't have one
    if (!global.fetch) {
      global.fetch = jest.fn();
    }
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    jest.restoreAllMocks();
    // Restore original fetch (may be undefined in jsdom)
    global.fetch = originalFetch;
  });

  it('throws ApiError with matching status and non-empty message for any 4xx/5xx status code', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 400, max: 599 }),
        async (statusCode) => {
          // Arrange: mock fetch to return a response with the generated error status.
          // We construct a plain object matching the Response interface because
          // the jsdom environment may not expose the global Response constructor.
          const mockResponse = {
            ok: false,
            status: statusCode,
            statusText: `HTTP Error ${statusCode}`,
            text: jest.fn().mockResolvedValue('Error from server'),
            json: jest.fn().mockResolvedValue({}),
          };
          global.fetch = jest.fn().mockResolvedValueOnce(mockResponse);

          // Act & Assert: request() must throw an ApiError
          let thrownError: unknown;
          try {
            await request<unknown>('GET', '/test-path');
          } catch (err) {
            thrownError = err;
          }

          // The thrown error must be an ApiError instance
          expect(thrownError).toBeInstanceOf(ApiError);

          const apiError = thrownError as ApiError;

          // status must equal the generated HTTP status code
          expect(apiError.status).toBe(statusCode);

          // message must be a non-empty string
          expect(typeof apiError.message).toBe('string');
          expect(apiError.message.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
