// src/services/teacherSectionsService.ts

import { request } from "./apiClient";
import { getTeacherId } from "./authStore";

const IS_MOCK = !process.env.NEXT_PUBLIC_API_BASE_URL;

export type TeacherSubject = {
  subjectId: string;
  subjectName: string;
  subjectCode?: string;
};

export type TeacherSection = {
  sectionId: string;
  sectionName: string;
  gradeId: string;
  gradeName: string;
  gradeLevel: number;
  academicYearId: string;
  academicYearName: string;
  subjects: TeacherSubject[];
};

type TeacherSectionApi = {
  section_id: string;
  section_name: string;
  grade_id: string;
  grade_name: string;
  grade_level: number;
  academic_year_id: string;
  academic_year_name: string;
  subjects: Array<{
    subject_id: string;
    subject_name: string;
    subject_code?: string;
  }>;
};

const MOCK_SECTIONS: TeacherSection[] = [
  {
    sectionId: "mock-section-a",
    sectionName: "Sec A",
    gradeId: "mock-grade-7",
    gradeName: "Grade 7",
    gradeLevel: 7,
    academicYearId: "mock-year-2024",
    academicYearName: "2024/2025",
    subjects: [
      { subjectId: "mock-math", subjectName: "Mathematics", subjectCode: "MATH" },
      { subjectId: "mock-physics", subjectName: "Physics", subjectCode: "PHYS" },
      { subjectId: "mock-chem", subjectName: "Chemistry", subjectCode: "CHEM" },
    ],
  },
  {
    sectionId: "mock-section-b",
    sectionName: "Sec B",
    gradeId: "mock-grade-7",
    gradeName: "Grade 7",
    gradeLevel: 7,
    academicYearId: "mock-year-2024",
    academicYearName: "2024/2025",
    subjects: [
      { subjectId: "mock-math", subjectName: "Mathematics", subjectCode: "MATH" },
    ],
  },
];

function mapTeacherSection(api: TeacherSectionApi): TeacherSection {
  return {
    sectionId: api.section_id,
    sectionName: api.section_name,
    gradeId: api.grade_id,
    gradeName: api.grade_name,
    gradeLevel: api.grade_level,
    academicYearId: api.academic_year_id,
    academicYearName: api.academic_year_name,
    subjects: api.subjects.map((subject) => ({
      subjectId: subject.subject_id,
      subjectName: subject.subject_name,
      subjectCode: subject.subject_code,
    })),
  };
}

export async function getTeacherSections(): Promise<TeacherSection[]> {
  if (IS_MOCK) {
    console.warn("⚠️ Using MOCK data for teacher sections. NEXT_PUBLIC_API_BASE_URL is not set.");
    return [...MOCK_SECTIONS];
  }
  
  const teacherId = getTeacherId();
  if (!teacherId) {
    console.error("❌ Teacher ID not found in localStorage or JWT token");
    console.warn("⚠️ Using mock data as fallback");
    return [...MOCK_SECTIONS];
  }
  
  const endpoint = `/api/teachers/${teacherId}/sections/`;
  console.log(`📡 Fetching teacher sections from: ${process.env.NEXT_PUBLIC_API_BASE_URL}${endpoint}`);
  
  try {
    const data = await request<TeacherSectionApi[]>("GET", endpoint);
    console.log("✅ Successfully fetched teacher sections:", data);
    return data.map(mapTeacherSection);
  } catch (error) {
    console.error("❌ Error fetching teacher sections:", error);
    console.warn("⚠️ Falling back to mock data");
    return [...MOCK_SECTIONS];
  }
}
