// src/services/profileService.ts

import { request, ApiError } from './apiClient';
import { getTeacherId } from './authStore';
import { getUserProfile } from './userProfileStore';

const IS_MOCK = !process.env.NEXT_PUBLIC_API_BASE_URL;

// --- Types ---

export interface TeacherProfile {
  name: string;
  initials: string;
  role: string;
  grade: string;
  section: string;
  email?: string;
  employeeId?: string;
  bio?: string;
  specialization?: string;
  joiningDate?: string;
  qualifications: TeacherQualification[];
}

export interface TeacherQualification {
  id: string;
  degreeName?: string;
  institution?: string;
  fieldOfStudy?: string;
  completionDate?: string;
  certificateCopy?: string;
}

export interface TeacherProfileUpdate {
  employeeId?: string;
  bio?: string;
  specialization?: string;
  joiningDate?: string;
}

type TeacherProfileApi = {
  id: string;
  user: string;
  user_name?: string;
  user_email?: string;
  employee_id?: string;
  bio?: string;
  specialization?: string;
  joining_date?: string;
  qualifications?: Array<{
    id: string;
    degree_name?: string;
    institution?: string;
    field_of_study?: string;
    completion_date?: string;
    certificate_copy?: string;
  }>;
};

// --- Mock data (matching hardcoded values in page.tsx) ---

const HARDCODED_PROFILE: TeacherProfile = {
  name: 'Sara Kassa',
  initials: 'SK',
  role: 'Primary Teacher',
  grade: 'Grade 7',
  section: 'Sec A',
  email: 'sara.kassa@school.com',
  employeeId: 'EGA-7A-01',
  bio: 'Focused on building strong learning habits and parent engagement.',
  specialization: 'Primary Education',
  joiningDate: '2024-01-15',
  qualifications: [
    {
      id: 'QUAL-001',
      degreeName: 'B.Ed. in Primary Education',
      institution: 'Addis Ababa University',
      fieldOfStudy: 'Education',
      completionDate: '2022-06-15',
    },
  ],
};

function buildInitials(name?: string) {
  if (!name) return 'T';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'T';
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? 'T';
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function mapTeacherProfile(api: TeacherProfileApi): TeacherProfile {
  const name = api.user_name || 'Teacher';
  return {
    name,
    initials: buildInitials(name),
    role: api.specialization ? `Teacher • ${api.specialization}` : 'Teacher',
    grade: 'Grade 7',
    section: 'Sec A',
    email: api.user_email,
    employeeId: api.employee_id,
    bio: api.bio,
    specialization: api.specialization,
    joiningDate: api.joining_date,
    qualifications:
      api.qualifications?.map((qualification) => ({
        id: qualification.id,
        degreeName: qualification.degree_name,
        institution: qualification.institution,
        fieldOfStudy: qualification.field_of_study,
        completionDate: qualification.completion_date,
        certificateCopy: qualification.certificate_copy,
      })) ?? [],
  };
}

// --- Service functions ---

/**
 * Returns the teacher's profile.
 * First tries to use the stored user profile from /api/users/me/
 * Falls back to fetching from /api/teachers/{id}/ if not available
 * In mock mode, returns the hardcoded profile matching page.tsx values.
 */
export async function getTeacherProfile(): Promise<TeacherProfile> {
  // Try to use stored user profile first
  const userProfile = getUserProfile();
  console.log('📋 getUserProfile() returned:', userProfile);
  
  if (userProfile) {
    console.log('✅ Using stored user profile:', userProfile.name);
    return {
      name: userProfile.name,
      initials: buildInitials(userProfile.name),
      role: userProfile.role === 'TEACHER' ? 'Teacher' : userProfile.role,
      grade: 'Grade 7',
      section: 'Sec A',
      email: userProfile.email,
      qualifications: [],
    };
  }

  console.log('⚠️ No stored user profile found');

  // Fall back to API call
  if (IS_MOCK) {
    console.log('⚠️ Using MOCK hardcoded profile');
    return { ...HARDCODED_PROFILE };
  }
  
  const teacherId = getTeacherId();
  if (!teacherId) {
    throw new Error('Teacher account not found. Please sign in again.');
  }
  try {
    const data = await request<TeacherProfileApi>('GET', `/api/teachers/${teacherId}/`);
    return mapTeacherProfile(data);
  } catch (error) {
    console.warn('⚠️ Failed to fetch teacher profile from API, using hardcoded profile');
    return { ...HARDCODED_PROFILE };
  }
}

export async function updateTeacherProfile(update: TeacherProfileUpdate): Promise<TeacherProfile> {
  if (IS_MOCK) {
    return {
      ...HARDCODED_PROFILE,
      ...update,
      role: update.specialization
        ? `Teacher • ${update.specialization}`
        : HARDCODED_PROFILE.role,
    };
  }

  const teacherId = getTeacherId();
  if (!teacherId) {
    throw new Error('Teacher account not found. Please sign in again.');
  }

  const payload: Record<string, string> = {};
  if (update.employeeId !== undefined) payload.employee_id = update.employeeId;
  if (update.bio !== undefined) payload.bio = update.bio;
  if (update.specialization !== undefined) payload.specialization = update.specialization;
  if (update.joiningDate !== undefined) payload.joining_date = update.joiningDate;

  try {
    console.log(`📝 Updating teacher profile with ID: ${teacherId}`, payload);
    const data = await request<TeacherProfileApi>('PATCH', `/api/teachers/${teacherId}/`, payload);
    console.log('✅ Teacher profile updated successfully');
    return mapTeacherProfile(data);
  } catch (error) {
    console.error('❌ Failed to update teacher profile:', error);
    
    // If 404, it means the teacher record doesn't exist
    if (error instanceof ApiError && error.status === 404) {
      throw new Error(
        'Teacher profile not found in the system. Please contact your administrator to create your teacher record.'
      );
    }
    
    throw error;
  }
}
