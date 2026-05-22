// Feature: backend-integration-refactor, Property 10: Timetable slot filter
// Validates: Requirements 8.2

import * as fc from 'fast-check';
import { getTimetable } from '../scheduleService';

/**
 * **Validates: Requirements 8.2**
 *
 * Property 10: Timetable slot filter
 * For any grade and section string, every ClassSlot returned by
 * getTimetable(grade, section) should have slot.grade === grade and
 * slot.section === section.
 */
describe('scheduleService — Property 10: Timetable slot filter', () => {
  it(
    'every returned ClassSlot has slot.grade === grade && slot.section === section',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(
            fc.constantFrom('Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'),
            fc.constantFrom('Sec A', 'Sec B', 'Sec C')
          ),
          async ([grade, section]) => {
            const slots = await getTimetable(grade, section);

            // Every returned slot must match the requested grade and section
            return slots.every(
              (slot) => slot.grade === grade && slot.section === section
            );
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});
