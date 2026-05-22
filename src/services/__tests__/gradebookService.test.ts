// Feature: backend-integration-refactor, Property 3: Grade save round-trip
// Validates: Requirements 4.3, 4.5

import * as fc from 'fast-check';
import { getGrades, saveGrade, _resetMockStore } from '../gradebookService';

describe('gradebookService — Property 3: Grade save round-trip', () => {
  beforeEach(() => {
    _resetMockStore();
  });

  it(
    'getGrades(activityId) after saveGrade(activityId, studentId, score) returns the saved score for that student',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(
            fc.constantFrom('ACT-001', 'ACT-002', 'ACT-003', 'ACT-006', 'ACT-007', 'ACT-008'),
            fc.constantFrom(
              'STU-00421',
              'STU-00398',
              'STU-00412',
              'STU-00355',
              'STU-00467',
              'STU-00480',
              'STU-00391',
              'STU-00403'
            ),
            fc.option(fc.float({ min: 0, max: 100 }))
          ),
          async ([activityId, studentId, score]) => {
            // Reset store before each iteration for independence
            _resetMockStore();

            await saveGrade(activityId, studentId, score);
            const grades = await getGrades(activityId);

            // Find the record for this student
            const record = grades.find((g) => g.studentId === studentId);

            // The record must exist and its score must equal the saved value
            if (record === undefined) return false;

            // Handle NaN: fc.float can produce NaN; treat NaN === NaN as equal
            if (score === null) return record.score === null;
            if (typeof score === 'number' && isNaN(score)) {
              return typeof record.score === 'number' && isNaN(record.score);
            }
            return record.score === score;
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});
