// src/services/profileService.ts

import { request } from './apiClient';

const IS_MOCK = !process.env.NEXT_PUBLIC_API_BASE_URL;

// --- Types ---

export interface TeacherProfile {
  name: string;
  initials: string;
  role: string;
  grade: string;
  section: string;
}

// --- Mock data (matching hardcoded values in page.tsx) ---

const HARDCODED_PROFILE: TeacherProfile = {
  name: 'Sara Kassa',
  initials: 'SK',
  role: 'Primary Teacher',
  grade: 'Grade 7',
  section: 'Sec A',
};

// --- Service functions ---

/**
 * Returns the teacher's profile.
 * In mock mode, returns the hardcoded profile matching page.tsx values.
 */
export async function getTeacherProfile(): Promise<TeacherProfile> {
  if (IS_MOCK) return { ...HARDCODED_PROFILE };
  return request<TeacherProfile>('GET', '/profile');
}
