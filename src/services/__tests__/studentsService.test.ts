// Feature: backend-integration-refactor, Property 4: Student update merge
// Validates: Requirements 3.4

import * as fc from 'fast-check';
import { getStudents, updateStudent, getStudentsBySection } from '../studentsService';

/**
 * Known student IDs in the mock store (from studentsService.ts mockStore).
 */
const KNOWN_IDS = [
  'STU-00421',
  'STU-00398',
  'STU-00412',
  'STU-00355',
  'STU-00467',
  'STU-00480',
  'STU-00391',
  'STU-00403',
] as const;

/**
 * Arbitrary for a partial Student changes object.
 * We only include fields that are safe to overwrite and easy to verify.
 * Using fc.record with requiredKeys: [] makes all fields optional.
 */
const partialStudentChangesArb = fc.record(
  {
    name: fc.string({ minLength: 1 }),
    grade: fc.string({ minLength: 1 }),
    parentName: fc.string({ minLength: 1 }),
    parentPhone: fc.string({ minLength: 1 }),
    parentEmail: fc.string({ minLength: 1 }),
    overallAvg: fc.integer({ min: 0, max: 100 }),
    attendance: fc.integer({ min: 0, max: 100 }),
    performance: fc.float({ min: 0, max: 100 }),
  },
  { requiredKeys: [] }
);

describe('studentsService — Property 4: Student update merge', () => {
  it(
    'updateStudent returns a student where every field in changes matches, and absent fields are unchanged',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...KNOWN_IDS),
          partialStudentChangesArb,
          async (studentId, changes) => {
            // Capture the original student state before mutation
            const allStudents = await getStudents();
            const original = allStudents.find((s) => s.id === studentId);
            if (!original) return true; // guard — should never happen with known IDs

            try {
              const updated = await updateStudent(studentId, changes);

              // updateStudent must return a non-null result for a known ID
              if (updated === null) return false;

              // 1. Every field present in `changes` must match the returned student
              for (const key of Object.keys(changes) as Array<keyof typeof changes>) {
                if (updated[key] !== changes[key]) return false;
              }

              // 2. Every field absent from `changes` must retain its original value
              const changedKeys = new Set(Object.keys(changes));
              for (const key of Object.keys(original) as Array<keyof typeof original>) {
                if (!changedKeys.has(key)) {
                  // Compare using JSON to handle objects/arrays
                  if (JSON.stringify(updated[key]) !== JSON.stringify(original[key])) {
                    return false;
                  }
                }
              }

              return true;
            } finally {
              // Restore the original student state so subsequent iterations start clean
              await updateStudent(studentId, original);
            }
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});

// Feature: backend-integration-refactor, Property 5: Section filter correctness
// Validates: Requirements 3.5

/**
 * **Validates: Requirements 3.5**
 *
 * Property 5: Section filter correctness
 * For any section string, every Student returned by getStudentsBySection(section)
 * must have student.section === section, and no student from a different section
 * should appear in the result.
 */
describe('studentsService — Property 5: Section filter correctness', () => {
  it(
    'getStudentsBySection returns only students whose section matches the requested section',
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
            const students = await getStudentsBySection(section);

            // Every returned student must belong to the requested section
            for (const student of students) {
              if (student.section !== section) return false;
            }

            // No student from a different section should appear:
            // verify by checking that the result contains no student whose section differs
            const hasWrongSection = students.some((s) => s.section !== section);
            if (hasWrongSection) return false;

            return true;
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});
