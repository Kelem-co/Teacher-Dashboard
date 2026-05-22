// Feature: backend-integration-refactor, Property 1: Activity round-trip
// Validates: Requirements 2.4, 2.6

import * as fc from 'fast-check';
import { getActivities, createActivity, updateActivity, deleteActivity } from '../activitiesService';

// The service reads/writes localStorage under these keys
const STORAGE_KEY = 'edugov_activities';
const STORAGE_VERSION_KEY = 'edugov_activities_version';

/**
 * Reset the mock store between property iterations by clearing localStorage.
 * The service's loadActivities() falls back to defaultActivities when the key
 * is absent, giving each run a clean, deterministic starting state.
 */
function resetStore(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_VERSION_KEY);
}

// Arbitrary for a minimal valid Activity (required fields only)
const activityArb = fc.record({
  id: fc.string(),
  title: fc.string(),
  shortTitle: fc.string(),
  subject: fc.string(),
  type: fc.string(),
  maxScore: fc.nat(),
  sections: fc.array(fc.string(), { minLength: 1 }),
  status: fc.string(),
});

describe('activitiesService — Property 1: Activity round-trip', () => {
  beforeEach(() => {
    resetStore();
  });

  it('getActivities() after createActivity(activity) includes an object deeply equal to the created activity', async () => {
    await fc.assert(
      fc.asyncProperty(activityArb, async (activity) => {
        // Reset store before each iteration so runs are independent
        resetStore();

        await createActivity(activity);
        const activities = await getActivities();

        // The list must contain an entry deeply equal to the created activity
        const found = activities.some(
          (a) => JSON.stringify(a) === JSON.stringify(activity)
        );
        return found;
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: backend-integration-refactor, Property 12: Activity mutation dispatches reactivity event
// Validates: Requirements 12.1

// Arbitraries for each mutation type
const createMutationArb = fc.record({
  kind: fc.constant('create' as const),
  activity: fc.record({
    id: fc.string({ minLength: 1 }),
    title: fc.string(),
    shortTitle: fc.string(),
    subject: fc.string(),
    type: fc.string(),
    maxScore: fc.nat(),
    sections: fc.array(fc.string(), { minLength: 1 }),
    status: fc.string(),
  }),
});

const updateMutationArb = fc.record({
  kind: fc.constant('update' as const),
  id: fc.string({ minLength: 1 }),
  changes: fc.record({ title: fc.string() }),
});

const deleteMutationArb = fc.record({
  kind: fc.constant('delete' as const),
  id: fc.string({ minLength: 1 }),
});

const mutationArb = fc.oneof(createMutationArb, updateMutationArb, deleteMutationArb);

describe('activitiesService — Property 12: Activity mutation dispatches reactivity event', () => {
  beforeEach(() => {
    resetStore();
  });

  it(
    "each mutation dispatches 'edugov_activities_updated' exactly once",
    async () => {
      await fc.assert(
        fc.asyncProperty(mutationArb, async (mutation) => {
          // Reset store and spy before each iteration
          resetStore();
          const spy = jest.spyOn(window, 'dispatchEvent');

          try {
            if (mutation.kind === 'create') {
              await createActivity(mutation.activity);
            } else if (mutation.kind === 'update') {
              // Seed a matching activity so the update has something to find
              const seedActivity = {
                id: mutation.id,
                title: 'seed',
                shortTitle: 'seed',
                subject: 'seed',
                type: 'seed',
                maxScore: 0,
                sections: ['A'],
                status: 'Active',
              };
              await createActivity(seedActivity);
              // Clear the spy count from the seed createActivity call
              spy.mockClear();
              await updateActivity(mutation.id, mutation.changes);
            } else {
              // delete — seed first so there is something to delete
              const seedActivity = {
                id: mutation.id,
                title: 'seed',
                shortTitle: 'seed',
                subject: 'seed',
                type: 'seed',
                maxScore: 0,
                sections: ['A'],
                status: 'Active',
              };
              await createActivity(seedActivity);
              spy.mockClear();
              await deleteActivity(mutation.id);
            }

            // Count calls where the event name is 'edugov_activities_updated'
            const relevantCalls = spy.mock.calls.filter(
              ([event]) => event instanceof Event && event.type === 'edugov_activities_updated'
            );
            return relevantCalls.length === 1;
          } finally {
            spy.mockRestore();
          }
        }),
        { numRuns: 100 }
      );
    }
  );
});
