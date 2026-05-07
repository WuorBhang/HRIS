// Profile page: shows the signed-in user's details and avatar.
// - Admins can edit their own personal details inline (other users are
//   edited from the admin Users page).
// - Employer / employee users see read-only fields and must contact the
//   admin to make changes (this is also enforced by firestore.rules).
import { useEffect, useRef, useState } from "react";
import {
  collection,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  doc,
  where,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { db } from "../lib/firebase";
import { supabase, BUCKETS } from "../lib/supabase";
import {
  COLLECTIONS,
  ROLES,
  SUBSCRIPTION_STATUS_LABELS,
} from "../lib/constants";
import { formatDate } from "../lib/utils";
import { AUDIT, logAction } from "../lib/audit";
import { Button, Alert, Card, PageHeader, Input, Textarea } from "../lib/ui";
import Layout from "../components/Layout";
import Avatar from "../components/Avatar";

// Resize image to 480px JPEG dataURL.
const resize = (file) =>
  new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      const max = 480;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = img.width * scale;
      c.height = img.height * scale;
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((b) => res(b), "image/jpeg", 0.88);
    };
    img.src = URL.createObjectURL(file);
  });

const EMPTY_FORM = {
  fullName: "",
  phone: "",
  address: "",
  bio: "",
  dateOfBirth: "",
  nationalId: "",
  emergencyName: "",
  emergencyRelationship: "",
  emergencyPhone: "",
};

function profileToForm(p) {
  if (!p) return { ...EMPTY_FORM };
  const ec = p.emergencyContact;
  let emergencyName = "";
  let emergencyRelationship = "";
  let emergencyPhone = "";
  if (ec && typeof ec === "object") {
    emergencyName = ec.name || "";
    emergencyRelationship = ec.relationship || "";
    emergencyPhone = ec.phone || "";
  } else if (typeof ec === "string") {
    emergencyName = ec;
  }
  return {
    fullName: p.fullName || "",
    phone: p.phone || "",
    address: p.address || "",
    bio: p.bio || "",
    dateOfBirth: p.dateOfBirth || "",
    nationalId: p.nationalId || "",
    emergencyName,
    emergencyRelationship,
    emergencyPhone,
  };
}

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth();
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [contracts, setContracts] = useState([]);
  const avatarRef = useRef();

  const isAdmin = profile?.role === ROLES.ADMIN;

  useEffect(() => {
    if (!profile) return;
    if (profile.role === ROLES.EMPLOYEE) {
      getDocs(
        query(
          collection(db, COLLECTIONS.CONTRACTS),
          where("employeeId", "==", user.uid),
        ),
      )
        .then((s) =>
          setContracts(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
        )
        .catch(() => {});
    }
  }, [profile]); // eslint-disable-line

  // Keep the form in sync with the loaded profile so Cancel reverts cleanly.
  useEffect(() => {
    setForm(profileToForm(profile));
  }, [profile]);

  // Upload avatar to Supabase.
  const onAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setErr("");
    setOk("");
    try {
      const blob = await resize(file);
      const path = `${user.uid}/avatar.jpg`;
      const { error } = await supabase.storage
        .from(BUCKETS.AVATARS)
        .upload(path, blob, { contentType: "image/jpeg", upsert: true });
      if (error) throw new Error(error.message);
      const url =
        supabase.storage.from(BUCKETS.AVATARS).getPublicUrl(path).data
          ?.publicUrl + `?t=${Date.now()}`;
      await updateDoc(doc(db, COLLECTIONS.USERS, user.uid), {
        photoURL: url,
        updatedAt: serverTimestamp(),
      });
      await refreshProfile();
      setOk("Avatar updated.");
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  const setField = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const onSave = async () => {
    setErr("");
    setOk("");
    if (!form.fullName.trim()) {
      setErr("Full name is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
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
      };
      await updateDoc(doc(db, COLLECTIONS.USERS, user.uid), payload);
      logAction(AUDIT.PROFILE_UPDATED, user.uid, profile?.role, {
        self: true,
      });
      await refreshProfile();
      setEditing(false);
      setOk("Profile updated.");
    } catch (e2) {
      setErr(e2.message || "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  const onCancel = () => {
    setForm(profileToForm(profile));
    setEditing(false);
    setErr("");
    setOk("");
  };

  return (
    <Layout>
      <PageHeader
        title="My profile"
        subtitle={
          isAdmin
            ? "View and update your personal details."
            : "View your personal details. Contact an administrator to make changes."
        }
      />
      <div className="max-w-2xl space-y-6">
        {/* Avatar section */}
        <Card>
          <div className="flex items-center gap-5">
            <Avatar
              fullName={profile?.fullName}
              photoURL={profile?.photoURL}
              size={80}
            />
            <div>
              <h2 className="font-semibold text-primary mb-1">
                {profile?.fullName}
              </h2>
              <p className="text-xs text-muted-foreground mb-2 capitalize">
                {profile?.role}
              </p>
              <Button
                variant="outline"
                onClick={() => avatarRef.current?.click()}
                disabled={busy}
              >
                Upload photo
              </Button>
              <input
                ref={avatarRef}
                type="file"
                accept="image/*"
                onChange={onAvatar}
                className="hidden"
              />
            </div>
          </div>
        </Card>

        {/* Profile fields */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-primary">Personal details</h2>
            {isAdmin && !editing && (
              <Button variant="outline" onClick={() => setEditing(true)}>
                Edit
              </Button>
            )}
          </div>

          <Alert tone="error">{err}</Alert>
          <Alert tone="success">{ok}</Alert>

          {isAdmin && editing ? (
            <div className="space-y-3 text-sm">
              <Input
                label="Full name"
                value={form.fullName}
                onChange={setField("fullName")}
              />
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <div className="text-foreground">
                  {profile?.email || (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Email cannot be changed here.
                </p>
              </div>
              <Input
                label="Phone"
                value={form.phone}
                onChange={setField("phone")}
              />
              <Textarea
                label="Address"
                value={form.address}
                onChange={setField("address")}
                rows={2}
              />
              <Textarea
                label="Bio"
                value={form.bio}
                onChange={setField("bio")}
                rows={3}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Date of birth"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={setField("dateOfBirth")}
                />
                <Input
                  label="National ID"
                  value={form.nationalId}
                  onChange={setField("nationalId")}
                />
              </div>
              <div className="pt-2">
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                  Emergency contact
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <Input
                    label="Name"
                    value={form.emergencyName}
                    onChange={setField("emergencyName")}
                  />
                  <Input
                    label="Relationship"
                    value={form.emergencyRelationship}
                    onChange={setField("emergencyRelationship")}
                  />
                  <Input
                    label="Phone"
                    value={form.emergencyPhone}
                    onChange={setField("emergencyPhone")}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <Button onClick={onSave} disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </Button>
                <Button variant="outline" onClick={onCancel} disabled={saving}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-3 text-sm">
                <Field label="Full name" value={profile?.fullName} />
                <Field label="Email" value={profile?.email} />
                <Field label="Phone" value={profile?.phone} />
                <Field label="Address" value={profile?.address} multiline />
                <Field label="Bio" value={profile?.bio} multiline />
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="Date of birth"
                    value={
                      profile?.dateOfBirth
                        ? formatDate(profile.dateOfBirth)
                        : ""
                    }
                  />
                  <Field label="National ID" value={profile?.nationalId} />
                </div>
                <Field
                  label="Emergency contact"
                  value={formatEmergencyContact(profile?.emergencyContact)}
                />
              </div>
              {!isAdmin && (
                <p className="mt-4 text-xs text-muted-foreground">
                  To update any of these details, please contact an
                  administrator.
                </p>
              )}
            </>
          )}
        </Card>

        {/* Employee contracts */}
        {profile?.role === ROLES.EMPLOYEE && contracts.length > 0 && (
          <Card>
            <h2 className="font-semibold text-primary mb-3">My contracts</h2>
            <ul className="divide-y divide-border">
              {contracts.map((c) => (
                <li key={c.id} className="py-2 text-sm">
                  <span className="font-medium">
                    {c.employerName || "Employer"}
                  </span>
                  <span className="text-muted-foreground ml-2">
                    {c.type} · {formatDate(c.startDate)}
                    {c.endDate ? ` → ${formatDate(c.endDate)}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Employer subscription card */}
        {profile?.role === ROLES.EMPLOYER && (
          <Card>
            <h2 className="font-semibold text-primary mb-3">Subscription</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <Field label="Tier" value={profile?.tier || "Free"} />
              <Field
                label="Status"
                value={
                  SUBSCRIPTION_STATUS_LABELS[profile?.subscriptionStatus] ||
                  profile?.subscriptionStatus ||
                  "—"
                }
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Subscription tier and status are managed by an administrator.
            </p>
          </Card>
        )}
      </div>
    </Layout>
  );
}

// Read-only field row.
function Field({ label, value, multiline }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-0.5">
        {label}
      </div>
      <div
        className={`text-foreground ${multiline ? "whitespace-pre-wrap" : ""}`}
      >
        {renderFieldValue(value)}
      </div>
    </div>
  );
}

// Defensive value renderer: never let an object/array crash the page.
function renderFieldValue(v) {
  if (v === null || v === undefined || v === "") {
    return <span className="text-muted-foreground">—</span>;
  }
  if (
    typeof v === "string" ||
    typeof v === "number" ||
    typeof v === "boolean"
  ) {
    return String(v);
  }
  if (Array.isArray(v)) return v.map(renderScalar).filter(Boolean).join(", ");
  if (typeof v === "object") {
    const parts = Object.entries(v)
      .filter(([, val]) => val !== null && val !== undefined && val !== "")
      .map(([k, val]) => `${k}: ${renderScalar(val)}`);
    return parts.length ? (
      parts.join(" · ")
    ) : (
      <span className="text-muted-foreground">—</span>
    );
  }
  return String(v);
}

function renderScalar(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

// Format emergency contact: it may be a plain string (legacy) or an
// object { name, relationship, phone }. Returns a printable string or "".
function formatEmergencyContact(v) {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    const { name, relationship, phone } = v;
    const parts = [];
    if (name) parts.push(name);
    if (relationship) parts.push(`(${relationship})`);
    if (phone) parts.push(`— ${phone}`);
    return parts.join(" ").trim();
  }
  return String(v);
}
