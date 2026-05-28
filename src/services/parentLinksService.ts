// src/services/parentLinksService.ts

import { request } from "./apiClient";

const IS_MOCK = !process.env.NEXT_PUBLIC_API_BASE_URL;

// Raw snake_case shape from the API
export interface ParentLinkApi {
  id: string;
  student: string;
  parent: string;
  relationship_type: "FATHER" | "MOTHER" | "GUARDIAN" | "OTHER";
  is_primary_contact: boolean;
  created_at: string;
  updated_at: string;
  parent_details: {
    id: string;
    user: string;
    secondary_phone_number?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    user_details: {
      id: string;
      name: string;
      father_name?: string;
      grandfather_name?: string;
      email?: string | null;
      phone_number?: string;
      address?: string;
      role?: string;
    };
  };
}

// Clean frontend-friendly shape
export interface ParentLink {
  id: string;
  student: string;
  parent: string;
  relationship_type: "FATHER" | "MOTHER" | "GUARDIAN" | "OTHER";
  is_primary_contact: boolean;
  parent_name: string;
  parent_phone: string;
  parent_email: string;
}

function mapParentLink(api: ParentLinkApi): ParentLink {
  const ud = api.parent_details?.user_details;
  return {
    id: api.id,
    student: api.student,
    parent: api.parent,
    relationship_type: api.relationship_type,
    is_primary_contact: api.is_primary_contact,
    parent_name: ud?.name ?? "",
    parent_phone: ud?.phone_number ?? api.parent_details?.secondary_phone_number ?? "",
    parent_email: ud?.email ?? "",
  };
}

interface ParentLinkListResponse {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: ParentLinkApi[];
}

const MOCK_PARENT_LINKS: ParentLink[] = [
  {
    id: "mock-parent-link-1",
    student: "STU-001",
    parent: "PAR-001",
    parent_name: "Alemayehu T.",
    parent_phone: "+251 92 344 5566",
    parent_email: "alemayehu.t@gmail.com",
    relationship_type: "FATHER",
    is_primary_contact: true,
  },
];

/**
 * Fetch parent links for a student.
 * GET /api/parent-links/?student=<studentId>
 */
export async function getParentLinks(
  studentId: string,
): Promise<ParentLink[]> {
  if (IS_MOCK) return MOCK_PARENT_LINKS;

  const params = new URLSearchParams();
  params.set("student", studentId);

  try {
    const data = await request<ParentLinkListResponse>(
      "GET",
      `/api/parent-links/?${params.toString()}`,
    );
    return (data.results ?? []).map(mapParentLink);
  } catch {
    return [];
  }
}
