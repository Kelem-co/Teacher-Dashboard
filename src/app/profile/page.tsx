"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { getTeacherProfile, updateTeacherProfile, type TeacherProfile, type TeacherProfileUpdate } from "../../services";
import { getAccessToken } from "../../services/authStore";
import { ArrowLeft, Save, User } from "lucide-react";

export default function TeacherProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authChecked, setAuthChecked] = useState(false);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [form, setForm] = useState<TeacherProfileUpdate>({});
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setAuthChecked(true);
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;
    const editMode = searchParams.get("edit") === "true";
    setIsEditing(editMode);
  }, [authChecked, searchParams]);

  useEffect(() => {
    if (!authChecked) return;
    setLoading(true);
    getTeacherProfile()
      .then((data) => {
        setProfile(data);
        setForm({
          employeeId: data.employeeId,
          specialization: data.specialization,
          joiningDate: data.joiningDate,
          bio: data.bio,
        });
      })
      .catch((err) => {
        setError((err as Error).message || "Failed to load profile.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [authChecked]);

  const handleChange = (field: keyof TeacherProfileUpdate, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateTeacherProfile(form);
      setProfile(updated);
      setIsEditing(false);
    } catch (err) {
      setError((err as Error).message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  if (!authChecked) return null;

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={16} /> Back to dashboard
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white border border-slate-100 rounded-3xl shadow-sm p-8"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-[#1A237E] text-white flex items-center justify-center font-bold text-lg">
              {profile?.initials ?? "T"}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Teacher Profile</h1>
              <p className="text-sm text-slate-500">Keep your profile details up to date.</p>
            </div>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="text-sm text-slate-500">Loading profile...</div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase">Full name</label>
                  <input
                    type="text"
                    value={profile?.name ?? ""}
                    disabled
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 disabled:bg-slate-50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase">Email</label>
                  <input
                    type="email"
                    value={profile?.email ?? ""}
                    disabled
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 disabled:bg-slate-50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase">Employee ID</label>
                  <input
                    type="text"
                    value={form.employeeId ?? ""}
                    onChange={(e) => handleChange("employeeId", e.target.value)}
                    disabled={!isEditing}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 disabled:bg-slate-50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase">Specialization</label>
                  <input
                    type="text"
                    value={form.specialization ?? ""}
                    onChange={(e) => handleChange("specialization", e.target.value)}
                    disabled={!isEditing}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 disabled:bg-slate-50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase">Joining date</label>
                  <input
                    type="date"
                    value={form.joiningDate ?? ""}
                    onChange={(e) => handleChange("joiningDate", e.target.value)}
                    disabled={!isEditing}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 disabled:bg-slate-50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase">Role</label>
                  <div className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-slate-50 text-slate-600">
                    {profile?.role ?? "Teacher"}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase">Bio</label>
                <textarea
                  value={form.bio ?? ""}
                  onChange={(e) => handleChange("bio", e.target.value)}
                  disabled={!isEditing}
                  rows={4}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 disabled:bg-slate-50"
                />
              </div>

              <div className="flex items-center gap-3">
                {!isEditing ? (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-900 text-white text-sm font-semibold px-4 py-2"
                  >
                    <User size={16} /> Edit profile
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-lg bg-slate-900 text-white text-sm font-semibold px-4 py-2 disabled:opacity-60"
                    >
                      <Save size={16} /> {saving ? "Saving..." : "Save changes"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setForm({
                          employeeId: profile?.employeeId,
                          specialization: profile?.specialization,
                          joiningDate: profile?.joiningDate,
                          bio: profile?.bio,
                        });
                        setIsEditing(false);
                      }}
                      className="text-sm font-semibold text-slate-600 hover:text-slate-900"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>

              <div className="border-t border-slate-100 pt-6">
                <h2 className="text-sm font-semibold text-slate-700 uppercase mb-4">Qualifications</h2>
                {profile?.qualifications?.length ? (
                  <div className="space-y-3">
                    {profile.qualifications.map((qualification) => (
                      <div
                        key={qualification.id}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                      >
                        <p className="text-sm font-semibold text-slate-900">
                          {qualification.degreeName || "Qualification"}
                        </p>
                        <p className="text-xs text-slate-600">
                          {qualification.institution || "Institution not provided"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {qualification.fieldOfStudy || "Field not specified"}
                          {qualification.completionDate
                            ? ` • Completed ${qualification.completionDate}`
                            : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No qualifications listed yet.</p>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
