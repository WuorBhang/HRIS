import { useState, useEffect, useRef } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import {
  updateProfile,
  updateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, auth, storage } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";

function ProgressBar({ value }) {
  return (
    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
      <div
        className="bg-[#1B4F72] h-1.5 rounded-full transition-all duration-300"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export default function Profile() {
  const { user, role } = useAuth();
  const avatarRef = useRef(null);
  const cvRef = useRef(null);

  const [profileDocId, setProfileDocId] = useState(null);
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    phone: "",
    whatsapp: "",
    dateOfBirth: "",
    address: "",
    kraPin: "",
  });
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [cvUrl, setCvUrl] = useState(null);
  const [cvName, setCvName] = useState(null);

  const [avatarProgress, setAvatarProgress] = useState(0);
  const [cvProgress, setCvProgress] = useState(0);
  const [uploading, setUploading] = useState({ avatar: false, cv: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  // Re-auth modal state
  const [showReauth, setShowReauth] = useState(false);
  const [reauthPassword, setReauthPassword] = useState("");
  const [reauthError, setReauthError] = useState("");
  const [pendingEmailChange, setPendingEmailChange] = useState(null);

  useEffect(() => {
    if (user) loadProfile();
  }, [user]);

  async function loadProfile() {
    setLoading(true);
    try {
      const q = query(
        collection(db, "userProfiles"),
        where("uid", "==", user.uid),
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const data = snap.docs[0].data();
        setProfileDocId(snap.docs[0].id);
        setForm({
          displayName: data.displayName || user.displayName || "",
          email: data.email || user.email || "",
          phone: data.phone || "",
          whatsapp: data.whatsapp || "",
          dateOfBirth: data.dateOfBirth || "",
          address: data.address || "",
          kraPin: data.kraPin || "",
        });
        setAvatarUrl(data.avatarUrl || user.photoURL || null);
        setCvUrl(data.cvUrl || null);
        setCvName(data.cvName || null);
      } else {
        // admin or user not in userProfiles yet
        setForm({
          displayName: user.displayName || "",
          email: user.email || "",
          phone: "",
          whatsapp: "",
          dateOfBirth: "",
          address: "",
          kraPin: "",
        });
        setAvatarUrl(user.photoURL || null);
      }
    } catch (e) {
      setError("Failed to load profile: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  // Compress & resize image before upload (makes uploads 5-10× faster)
  async function compressImage(file, maxDim = 800, quality = 0.85) {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        if (width <= maxDim && height <= maxDim) {
          resolve(file);
          return;
        }
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) =>
            resolve(
              new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
                type: "image/jpeg",
              }),
            ),
          "image/jpeg",
          quality,
        );
      };
      img.src = url;
    });
  }

  function uploadFile(file, storagePath, onProgress, onDone, onError) {
    const storageRef = ref(storage, storagePath);
    const task = uploadBytesResumable(storageRef, file);
    task.on(
      "state_changed",
      (snap) =>
        onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      (err) => onError(err),
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        onDone(url);
      },
    );
  }

  async function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be under 10 MB.");
      return;
    }
    setUploading((p) => ({ ...p, avatar: true }));
    setAvatarProgress(0);
    setError("");
    try {
      const compressed = await compressImage(file);
      uploadFile(
        compressed,
        `avatars/${user.uid}/profile.jpg`,
        setAvatarProgress,
        async (url) => {
          setAvatarUrl(url);
          setAvatarProgress(100);
          setUploading((p) => ({ ...p, avatar: false }));
          await updateProfile(auth.currentUser, { photoURL: url });
          if (profileDocId)
            await updateDoc(doc(db, "userProfiles", profileDocId), {
              avatarUrl: url,
              updatedAt: serverTimestamp(),
            });
          setSuccess("Profile photo updated.");
        },
        (err) => {
          setError("Upload failed: " + err.message);
          setUploading((p) => ({ ...p, avatar: false }));
        },
      );
    } catch (err) {
      setError("Failed to process image: " + err.message);
      setUploading((p) => ({ ...p, avatar: false }));
    }
  }

  async function handleCvChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("CV must be a PDF file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("CV must be under 10 MB.");
      return;
    }
    setUploading((p) => ({ ...p, cv: true }));
    setError("");
    uploadFile(
      file,
      `cvs/${user.uid}/cv.pdf`,
      setCvProgress,
      async (url) => {
        setCvUrl(url);
        setCvName(file.name);
        setCvProgress(100);
        setUploading((p) => ({ ...p, cv: false }));
        if (profileDocId)
          await updateDoc(doc(db, "userProfiles", profileDocId), {
            cvUrl: url,
            cvName: file.name,
            updatedAt: serverTimestamp(),
          });
        setSuccess("CV uploaded successfully.");
      },
      (err) => {
        setError("CV upload failed: " + err.message);
        setUploading((p) => ({ ...p, cv: false }));
      },
    );
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      // Update display name in Firebase Auth
      if (form.displayName !== user.displayName) {
        await updateProfile(auth.currentUser, {
          displayName: form.displayName,
        });
      }

      // Email change needs re-authentication
      if (form.email !== user.email) {
        setPendingEmailChange(form.email);
        setShowReauth(true);
        setSaving(false);
        return;
      }

      await persistProfile();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function persistProfile() {
    const profileData = {
      displayName: form.displayName,
      email: form.email,
      phone: form.phone,
      whatsapp: form.whatsapp,
      dateOfBirth: form.dateOfBirth,
      address: form.address,
      kraPin: form.kraPin,
      updatedAt: serverTimestamp(),
    };
    if (profileDocId) {
      await updateDoc(doc(db, "userProfiles", profileDocId), profileData);
    }
    setSuccess("Profile saved successfully.");
    setSaving(false);
  }

  async function handleReauth(e) {
    e.preventDefault();
    setReauthError("");
    try {
      const credential = EmailAuthProvider.credential(
        user.email,
        reauthPassword,
      );
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updateEmail(auth.currentUser, pendingEmailChange);
      setShowReauth(false);
      setReauthPassword("");
      setPendingEmailChange(null);
      await persistProfile();
    } catch (err) {
      setReauthError(
        err.code === "auth/wrong-password"
          ? "Incorrect password."
          : err.message,
      );
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-4 border-[#1B4F72] border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  const initials = (form.displayName || form.email || "?")
    .charAt(0)
    .toUpperCase();

  return (
    <Layout>
      <div className="p-6 max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1B4F72]">My Profile</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Manage your personal information and documents
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm mb-4">
            ✓ {success}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Avatar */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">
              Profile Photo
            </h2>
            <div className="flex items-center gap-6">
              <div className="relative flex-shrink-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover ring-4 ring-[#1B4F72]/10"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-[#1B4F72] flex items-center justify-center text-white text-3xl font-bold ring-4 ring-[#1B4F72]/10">
                    {initials}
                  </div>
                )}
                {uploading.avatar && (
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                    <span className="text-white text-sm font-bold">
                      {avatarProgress}%
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-3">
                  JPG, PNG or GIF — max 5 MB
                </p>
                <input
                  type="file"
                  ref={avatarRef}
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => avatarRef.current?.click()}
                  disabled={uploading.avatar}
                  className="px-4 py-2 bg-[#1B4F72] text-white rounded-lg text-sm font-medium hover:bg-[#154360] disabled:opacity-60"
                >
                  {uploading.avatar
                    ? `Uploading ${avatarProgress}%…`
                    : "Upload Photo"}
                </button>
                {uploading.avatar && <ProgressBar value={avatarProgress} />}
              </div>
            </div>
          </div>

          {/* Personal Info */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">
              Personal Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) =>
                    setForm({ ...form, displayName: e.target.value })
                  }
                  className="input-field"
                  placeholder="Your full name"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input-field"
                  placeholder="you@example.com"
                />
                {form.email !== user.email && (
                  <p className="text-amber-600 text-xs mt-1">
                    ⚠ Changing your email will require your current password to
                    confirm.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="input-field"
                  placeholder="+254 712 345 678"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  WhatsApp Number
                </label>
                <input
                  type="tel"
                  value={form.whatsapp}
                  onChange={(e) =>
                    setForm({ ...form, whatsapp: e.target.value })
                  }
                  className="input-field"
                  placeholder="+254 712 345 678"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) =>
                    setForm({ ...form, dateOfBirth: e.target.value })
                  }
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  KRA PIN
                </label>
                <input
                  type="text"
                  value={form.kraPin}
                  onChange={(e) => setForm({ ...form, kraPin: e.target.value })}
                  className="input-field"
                  placeholder="A123456789B"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                  className="input-field"
                  placeholder="Area, City, County"
                />
              </div>
            </div>
          </div>

          {/* CV Upload — employees only */}
          {role === "employee" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-800 mb-1">
                Curriculum Vitae (CV)
              </h2>
              <p className="text-gray-500 text-sm mb-4">PDF only — max 10 MB</p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {cvUrl ? (
                  <a
                    href={cvUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 hover:bg-gray-100 transition-colors group"
                  >
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-red-600 text-sm font-bold">
                        PDF
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate group-hover:text-[#1B4F72]">
                        {cvName || "cv.pdf"}
                      </p>
                      <p className="text-xs text-gray-400">Click to open</p>
                    </div>
                  </a>
                ) : (
                  <div className="flex-1 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl px-4 py-5 text-center">
                    <p className="text-gray-400 text-sm">No CV uploaded yet</p>
                  </div>
                )}
                <div className="flex-shrink-0">
                  <input
                    type="file"
                    ref={cvRef}
                    accept="application/pdf"
                    onChange={handleCvChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => cvRef.current?.click()}
                    disabled={uploading.cv}
                    className="px-4 py-2.5 border-2 border-[#1B4F72] text-[#1B4F72] rounded-lg text-sm font-medium hover:bg-[#1B4F72]/5 disabled:opacity-60 whitespace-nowrap"
                  >
                    {uploading.cv
                      ? `Uploading ${cvProgress}%…`
                      : cvUrl
                        ? "Replace CV"
                        : "Upload CV"}
                  </button>
                  {uploading.cv && <ProgressBar value={cvProgress} />}
                </div>
              </div>
            </div>
          )}

          {/* Account info (read-only) */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">
              Account Information
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-0.5">
                  Role
                </p>
                <p className="text-gray-800 font-medium capitalize">
                  {role || "—"}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-0.5">
                  User ID
                </p>
                <p className="text-gray-500 font-mono text-xs truncate">
                  {user?.uid}
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                To change your password, use the "Forgot password?" link on the
                login page, or contact your administrator.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-[#F39C12] hover:bg-[#d68910] text-white rounded-xl font-semibold text-sm disabled:opacity-60 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Re-authentication modal for email change */}
      {showReauth && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-bold text-[#1B4F72]">
                Confirm Your Password
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                For security, please enter your current password to update your
                email address.
              </p>
            </div>
            <form onSubmit={handleReauth} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={reauthPassword}
                  onChange={(e) => setReauthPassword(e.target.value)}
                  required
                  className="input-field"
                  placeholder="••••••••"
                  autoFocus
                />
              </div>
              {reauthError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                  {reauthError}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowReauth(false);
                    setPendingEmailChange(null);
                    setReauthPassword("");
                  }}
                  className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#1B4F72] text-white py-2.5 rounded-lg hover:bg-[#154360] text-sm font-medium"
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
