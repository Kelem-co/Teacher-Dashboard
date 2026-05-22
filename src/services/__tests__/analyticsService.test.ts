// Feature: backend-integration-refactor, Property 13: Section analytics lookup
// Validates: Requirements 5.2

import * as fc from 'fast-check';
import { getSectionAnalytics, SECTION_DATA } from '../analyticsService';

describe('analyticsService — Property 13: Section analytics lookup', () => {
  it(
    'getSectionAnalytics(sectionName) returns a non-null object whose students, sectionAvg, and gradeDistribution match the mock data',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...Object.keys(SECTION_DATA)),
          async (sectionName) => {
            const result = await getSectionAnalytics(sectionName);

            // Must be non-null
            if (result === null) return false;

            const expected = SECTION_DATA[sectionName];

            // students field must match
            if (result.students !== expected.students) return false;

            // sectionAvg field must match
            if (result.sectionAvg !== expected.sectionAvg) return false;

            // gradeDistribution fields must match
            if (result.gradeDistribution.A !== expected.gradeDistribution.A) return false;
            if (result.gradeDistribution.B !== expected.gradeDistribution.B) return false;
            if (result.gradeDistribution.C !== expected.gradeDistribution.C) return false;
            if (result.gradeDistribution.F !== expected.gradeDistribution.F) return false;

            return true;
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});
