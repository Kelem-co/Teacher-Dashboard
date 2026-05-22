// Feature: backend-integration-refactor, Property 6: Homework entry round-trip
// Validates: Requirements 6.3, 6.6

import * as fc from 'fast-check';
import {
  getEntries,
  createEntry,
  _resetMockStore,
} from '../homeworkService';

// Generate a valid YYYY-MM-DD string without relying on fc.date() which can
// produce edge-case Date objects that fail toISOString() in some environments.
const dateStringArb = fc
  .tuple(
    fc.integer({ min: 2020, max: 2030 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 }) // cap at 28 to avoid month-length edge cases
  )
  .map(([y, m, d]) => {
    const mm = String(m).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  });

// Arbitrary for a valid DailyEntry without an id
const dailyEntryArb = fc.record({
  date: dateStringArb,
  section: fc.constantFrom(
    'Grade 7A',
    'Grade 7B',
    'Grade 8A',
    'Grade 8B',
    'Grade 9A',
    'Grade 10A'
  ),
  subject: fc.constantFrom('Mathematics', 'Physics', 'History', 'English', 'Biology'),
  type: fc.constantFrom('Homework', 'Classwork') as fc.Arbitrary<'Homework' | 'Classwork'>,
  title: fc.string({ minLength: 1, maxLength: 80 }),
  description: fc.string({ minLength: 0, maxLength: 200 }),
  maxScore: fc.integer({ min: 1, max: 100 }),
  scores: fc.constant({}),
  parentVisible: fc.boolean(),
});

/**
 * **Validates: Requirements 6.3, 6.6**
 *
 * Property 6: Homework entry round-trip
 * For any valid DailyEntry (without an ID), calling createEntry(entry) followed by
 * getEntries(entry.section) should return a list that includes the created entry
 * with all original fields preserved.
 */
describe('homeworkService — Property 6: Homework entry round-trip', () => {
  beforeEach(() => {
    _resetMockStore();
  });

  it(
    'getEntries(entry.section) after createEntry(entry) includes the created entry with all original fields preserved',
    async () => {
      await fc.assert(
        fc.asyncProperty(dailyEntryArb, async (entryWithoutId) => {
          // Reset store before each iteration for independence
          _resetMockStore();

          const created = await createEntry(entryWithoutId);

          // The created entry must have an id assigned
          if (!created.id) return false;

          const entries = await getEntries(created.section);

          // The created entry must appear in the results
          const found = entries.find((e) => e.id === created.id);
          if (!found) return false;

          // All original fields must be preserved
          const fieldsToCheck = Object.keys(entryWithoutId) as Array<
            keyof typeof entryWithoutId
          >;
          for (const key of fieldsToCheck) {
            if (JSON.stringify(found[key]) !== JSON.stringify(entryWithoutId[key])) {
              return false;
            }
          }

          return true;
        }),
        { numRuns: 100 }
      );
    }
  );
});

// Feature: backend-integration-refactor, Property 7: Homework section filter
// Validates: Requirements 6.2

/**
 * **Validates: Requirements 6.2**
 *
 * Property 7: Homework section filter
 * For any section string, every DailyEntry returned by getEntries(section)
 * should have entry.section === section.
 */
describe('homeworkService — Property 7: Homework section filter', () => {
  beforeEach(() => {
    _resetMockStore();
  });

  it(
    'getEntries(section) returns only entries whose section matches the requested section',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            'Grade 7A',
            'Grade 7B',
            'Grade 8A',
            'Grade 8B',
            'Grade 9A',
            'Grade 10A'
          ),
          async (section) => {
            const entries = await getEntries(section);

            // Every returned entry must belong to the requested section
            for (const entry of entries) {
              if (entry.section !== section) return false;
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});
