import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  verifyBeforeUpdateEmail,
  updateProfile,
} from "firebase/auth";
import { Camera, Loader2, Save, KeyRound, Mail, Pencil, X } from "lucide-react";

import Layout from "../components/Layout";
import Avatar from "../components/Avatar";
import { auth, db } from "../lib/firebase";
import { supabase, SUPABASE_BUCKETS } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { COLLECTIONS, ROLES } from "../lib/constants";
import { AUDIT_ACTIONS, logAction } from "../lib/audit";

const MAX_AVATAR_DIM = 480;
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

// Resize the chosen image down to MAX_AVATAR_DIM (longest side) and re-encode
// as JPEG so uploads stay small and fast even from phone cameras.
async function compressImage(file) {
  const previewUrl = URL.createObjectURL(file);
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Could not read the image."));
    i.src = previewUrl;
  });
  const ratio = Math.min(1, MAX_AVATAR_DIM / Math.max(img.width, img.height));
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported in this browser.");
  ctx.drawImage(img, 0, 0, w, h);
  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85),
  );
  if (!blob) throw new Error("Could not encode image.");
  return { blob, previewUrl };
}

const ROLE_LABEL = {
  employer: "Employer",
  employee: "Employee",
};

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth();

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    address: "",
    bio: "",
    dateOfBirth: "",
    nationalId: "",
    emergencyName: "",
    emergencyRelationship: "",
    emergencyPhone: "",
  });
  const [photoURL, setPhotoURL] = useState("");
  // Local blob URL shown during upload so the new picture appears instantly,
  // before the Firebase Storage URL has resolved.
  const [optimisticPhoto, setOptimisticPhoto] = useState(null);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [savedErr, setSavedErr] = useState("");
  const fileInput = useRef(null);

  // Employee-only contracts list.
  const [contracts, setContracts] = useState([]);
  const [contractsLoading, setContractsLoading] = useState(false);

  // Email-change modal state.
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({
    newEmail: "",
    currentPassword: "",
  });
  const [emailMsg, setEmailMsg] = useState("");
  const [emailErr, setEmailErr] = useState("");
  const [changingEmail, setChangingEmail] = useState(false);

  // Hydrate the form whenever the profile doc changes.
  useEffect(() => {
    if (!profile) return;
    setForm({
      fullName: profile.fullName ?? "",
      phone: profile.phone ?? "",
      address: profile.address ?? "",
      bio: profile.bio ?? "",
      dateOfBirth: profile.dateOfBirth ?? "",
      nationalId: profile.nationalId ?? "",
      emergencyName: profile.emergencyContact?.name ?? "",
      emergencyRelationship: profile.emergencyContact?.relationship ?? "",
      emergencyPhone: profile.emergencyContact?.phone ?? "",
    });
    setPhotoURL(profile.photoURL ?? "");
  }, [profile]);

  // Free the temporary blob URL once we no longer need it.
  useEffect(() => {
    return () => {
      if (optimisticPhoto) URL.revokeObjectURL(optimisticPhoto);
    };
  }, [optimisticPhoto]);

  // Load the employee's contracts (denormalized employer info already on the doc).
  useEffect(() => {
    if (!profile || profile.role !== ROLES.EMPLOYEE) return;
    let cancelled = false;
    setContractsLoading(true);
    (async () => {
      try {
        const q = query(
          collection(db, COLLECTIONS.CONTRACTS),
          where("employeeId", "==", profile.id),
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        setContracts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch {
        if (!cancelled) setContracts([]);
      } finally {
        if (!cancelled) setContractsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile]);

  const handlePickFile = () => fileInput.current?.click();

  const handleUpload = async (file) => {
    if (!user || !profile) return;
    setSavedMsg("");
    setSavedErr("");
    if (!file.type.startsWith("image/")) {
      setSavedErr("Please choose an image file.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setSavedErr("Image is too large. Maximum size is 5 MB.");
      return;
    }
    setUploading(true);
    try {
      const { blob, previewUrl } = await compressImage(file);
      setOptimisticPhoto(previewUrl);
      const path = `${user.uid}/avatar.jpg`;
      const { error: upErr } = await supabase.storage
        .from(SUPABASE_BUCKETS.AVATARS)
        .upload(path, blob, { contentType: "image/jpeg", upsert: true });
      if (upErr) {
        throw new Error(
          upErr.message?.includes("row-level security")
            ? "Supabase blocked the upload. Make sure the 'avatars' bucket exists and allows uploads (see SUPABASE_SETUP.md)."
            : upErr.message || "Photo upload failed.",
        );
      }
      const { data: pub } = supabase.storage
        .from(SUPABASE_BUCKETS.AVATARS)
        .getPublicUrl(path);
      // Cache-bust so the new picture replaces the old one in <img> tags
      // even though the path is identical.
      const url = `${pub.publicUrl}?v=${Date.now()}`;
      await updateDoc(doc(db, COLLECTIONS.USERS, user.uid), {
        photoURL: url,
        updatedAt: serverTimestamp(),
      });
      // Mirror onto Firebase Auth profile so other surfaces (e.g. email links)
      // can use the same picture.
      try {
        await updateProfile(auth.currentUser, { photoURL: url });
      } catch {
        /* non-fatal */
      }
      setPhotoURL(url);
      setOptimisticPhoto(null);
      await refreshProfile();
      setSavedMsg("Profile photo updated.");
    } catch (e) {
      setOptimisticPhoto(null);
      setSavedErr(e.message || "Photo upload failed.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSavedMsg("");
    setSavedErr("");
    if (!form.fullName.trim()) {
      setSavedErr("Full name is required.");
      return;
    }
    setSaving(true);
    try {
      await updateDoc(doc(db, COLLECTIONS.USERS, user.uid), {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        bio: form.bio.trim(),
        dateOfBirth: form.dateOfBirth || "",
        nationalId: form.nationalId.trim(),
        emergencyContact: {
          name: form.emergencyName.trim(),
          relationship: form.emergencyRelationship.trim(),
          phone: form.emergencyPhone.trim(),
        },
        updatedAt: serverTimestamp(),
      });
      // Keep Firebase Auth's displayName in sync with the saved full name.
      if (form.fullName.trim() !== auth.currentUser?.displayName) {
        try {
          await updateProfile(auth.currentUser, {
            displayName: form.fullName.trim(),
          });
        } catch {
          /* non-fatal */
        }
      }
      await refreshProfile();
      logAction(AUDIT_ACTIONS.PROFILE_UPDATED, user.uid, profile?.role, {
        fields: [
          "fullName",
          "phone",
          "address",
          "bio",
          "dateOfBirth",
          "nationalId",
          "emergencyContact",
        ],
      });
      setSavedMsg("Profile saved.");
    } catch (e) {
      setSavedErr(e.message || "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  const openEmailDialog = () => {
    setEmailForm({ newEmail: profile?.email || "", currentPassword: "" });
    setEmailMsg("");
    setEmailErr("");
    setEmailDialogOpen(true);
  };

  const handleChangeEmail = async () => {
    const fbUser = auth.currentUser;
    if (!fbUser || !profile || !fbUser.email) return;
    setEmailMsg("");
    setEmailErr("");
    const newEmail = emailForm.newEmail.trim().toLowerCase();
    if (!newEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newEmail)) {
      setEmailErr("Enter a valid email address.");
      return;
    }
    if (!emailForm.currentPassword) {
      setEmailErr("Current password is required.");
      return;
    }
    if (newEmail === fbUser.email.toLowerCase()) {
      setEmailErr("That is already your current email.");
      return;
    }
    setChangingEmail(true);
    try {
      const cred = EmailAuthProvider.credential(
        fbUser.email,
        emailForm.currentPassword,
      );
      await reauthenticateWithCredential(fbUser, cred);
      // Modern Firebase requires email verification before the change takes
      // effect — a confirmation link is sent to the new address.
      await verifyBeforeUpdateEmail(fbUser, newEmail);
      setEmailMsg(
        `Verification link sent to ${newEmail}. Open it to finish updating your email — your sign-in email will only change after you confirm.`,
      );
      setEmailForm({ newEmail: "", currentPassword: "" });
    } catch (e) {
      const code = e.code ?? "";
      setEmailErr(
        code === "auth/wrong-password" || code === "auth/invalid-credential"
          ? "Current password is incorrect."
          : code === "auth/email-already-in-use"
            ? "That email is already used by another account."
            : code === "auth/operation-not-allowed"
              ? "Email change is not permitted — please contact your admin."
              : e.message || "Failed to update email.",
      );
    } finally {
      setChangingEmail(false);
    }
  };

  if (!profile) {
    return (
      <Layout>
        <div className="text-muted-foreground">Loading profile…</div>
      </Layout>
    );
  }

  const displayedPhoto = optimisticPhoto ?? photoURL;
  const isEmployee = profile.role === ROLES.EMPLOYEE;

  return (
    <Layout>
      <div className="max-w-4xl">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-primary">
            My Profile
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Update your personal details and profile picture.
          </p>
        </div>

        {savedMsg && (
          <div className="mb-4 p-3 rounded-md border border-green-300 bg-green-50 text-green-700 text-sm">
            {savedMsg}
          </div>
        )}
        {savedErr && (
          <div className="mb-4 p-3 rounded-md border border-destructive/40 bg-destructive/10 text-destructive text-sm">
            {savedErr}
          </div>
        )}

        <div className="space-y-6">
          {/* Header card with photo */}
          <section className="bg-card rounded-lg shadow p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
              <div className="relative">
                <Avatar
                  fullName={form.fullName || profile.fullName}
                  photoURL={displayedPhoto}
                  size={112}
                />
                {uploading && (
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}
                <button
                  onClick={handlePickFile}
                  disabled={uploading}
                  className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-primary text-primary-foreground border-2 border-card flex items-center justify-center shadow hover:opacity-90 disabled:opacity-50"
                  title="Change photo"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleUpload(f);
                  }}
                />
              </div>

              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-lg sm:text-xl font-semibold">
                  {form.fullName || profile.fullName}
                </h2>
                <p className="text-sm text-muted-foreground break-all">
                  {profile.email}
                </p>
                <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                  <span className="text-xs px-2 py-0.5 rounded-full border bg-purple-100 text-purple-700 border-purple-200 font-medium">
                    {ROLE_LABEL[profile.role] ?? profile.role}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-700 border-emerald-200 font-medium capitalize">
                    {profile.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Tap the camera to change your picture. Images are auto-resized
                  for fast upload.
                </p>
              </div>

              <div className="w-full sm:w-auto">
                <Link
                  href="/change-password"
                  className="inline-flex items-center justify-center gap-2 w-full sm:w-auto border border-border rounded-md px-3 py-2 text-sm hover:bg-muted/40"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  Change password
                </Link>
              </div>
            </div>
          </section>

          {/* Personal details */}
          <section className="bg-card rounded-lg shadow p-4 sm:p-6">
            <h3 className="text-base font-semibold mb-4">Personal details</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field
                label="Full name"
                value={form.fullName}
                onChange={(v) => setForm({ ...form, fullName: v })}
              />
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <div className="flex gap-2">
                  <input
                    value={profile.email}
                    readOnly
                    disabled
                    className="flex-1 px-3 py-2 rounded-md border border-border bg-muted/40 text-muted-foreground truncate"
                  />
                  <button
                    type="button"
                    onClick={openEmailDialog}
                    className="border border-border rounded-md px-3 hover:bg-muted/40"
                    title="Change email"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <Field
                label="Phone"
                type="tel"
                inputMode="tel"
                placeholder="+254 700 000 000"
                value={form.phone}
                onChange={(v) => setForm({ ...form, phone: v })}
              />
              <Field
                label="Date of birth"
                type="date"
                value={form.dateOfBirth}
                onChange={(v) => setForm({ ...form, dateOfBirth: v })}
              />
              <div className="sm:col-span-2">
                <Field
                  label="Address"
                  placeholder="Street, city, country"
                  value={form.address}
                  onChange={(v) => setForm({ ...form, address: v })}
                />
              </div>
              <div className="sm:col-span-2">
                <Field
                  label="National ID / Passport"
                  value={form.nationalId}
                  onChange={(v) => setForm({ ...form, nationalId: v })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">
                  About me
                </label>
                <textarea
                  rows={3}
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="A short introduction"
                  className="w-full px-3 py-2 rounded-md border border-border bg-card focus:ring-2 focus:ring-primary outline-none resize-none"
                />
              </div>
            </div>
          </section>

          {/* Emergency contact */}
          <section className="bg-card rounded-lg shadow p-4 sm:p-6">
            <h3 className="text-base font-semibold mb-4">Emergency contact</h3>
            <div className="grid sm:grid-cols-3 gap-4">
              <Field
                label="Name"
                value={form.emergencyName}
                onChange={(v) => setForm({ ...form, emergencyName: v })}
              />
              <Field
                label="Relationship"
                placeholder="Spouse, parent, sibling…"
                value={form.emergencyRelationship}
                onChange={(v) => setForm({ ...form, emergencyRelationship: v })}
              />
              <Field
                label="Phone"
                type="tel"
                inputMode="tel"
                value={form.emergencyPhone}
                onChange={(v) => setForm({ ...form, emergencyPhone: v })}
              />
            </div>
          </section>

          {/* Employee contracts */}
          {isEmployee && (
            <section className="bg-card rounded-lg shadow p-4 sm:p-6">
              <h3 className="text-base font-semibold mb-4">My contracts</h3>
              {contractsLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : contracts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  You do not have any contracts on file yet.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {contracts.map((c) => (
                    <li
                      key={c.id}
                      className="py-3 flex items-center justify-between text-sm"
                    >
                      <div>
                        <div className="font-medium">
                          {c.employerName || "Employer"}
                        </div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {c.contractType || "contract"}
                          {c.startDate ? ` · started ${c.startDate}` : ""}
                        </div>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                          c.active !== false
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                            : "bg-gray-200 text-gray-700 border-gray-300"
                        }`}
                      >
                        {c.active !== false ? "Active" : "Inactive"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <div className="flex justify-end pb-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:opacity-90 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>

      {/* Change-email modal */}
      {emailDialogOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => !changingEmail && setEmailDialogOpen(false)}
        >
          <div
            className="bg-card rounded-lg shadow-xl w-full max-w-md p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <Mail className="w-4 h-4" /> Change email
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Confirm your current password before updating your email.
                </p>
              </div>
              <button
                onClick={() => setEmailDialogOpen(false)}
                disabled={changingEmail}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {emailMsg && (
              <div className="mb-3 p-3 rounded-md border border-green-300 bg-green-50 text-green-700 text-xs">
                {emailMsg}
              </div>
            )}
            {emailErr && (
              <div className="mb-3 p-3 rounded-md border border-destructive/40 bg-destructive/10 text-destructive text-xs">
                {emailErr}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  New email
                </label>
                <input
                  type="email"
                  value={emailForm.newEmail}
                  onChange={(e) =>
                    setEmailForm({ ...emailForm, newEmail: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-md border border-border bg-card focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Current password
                </label>
                <input
                  type="password"
                  value={emailForm.currentPassword}
                  onChange={(e) =>
                    setEmailForm({
                      ...emailForm,
                      currentPassword: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-md border border-border bg-card focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setEmailDialogOpen(false)}
                disabled={changingEmail}
                className="border border-border rounded-md px-3 py-2 text-sm hover:bg-muted/40"
              >
                Close
              </button>
              <button
                onClick={handleChangeEmail}
                disabled={changingEmail}
                className="inline-flex items-center bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {changingEmail && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {changingEmail ? "Sending…" : "Send verification"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  inputMode,
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        type={type}
        value={value}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-md border border-border bg-card focus:ring-2 focus:ring-primary outline-none"
      />
    </div>
  );
}
