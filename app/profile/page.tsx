"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useAuth } from "../../components/auth-provider";
import { ThemeToggle } from "../../components/theme-toggle";
import { getProfileDetails, saveProfileDetails, validateProfileUrl, type ProfileDetails } from "../../lib/profile";

export default function Profile() {
  const { user, signOut } = useAuth();
  if (!user) return <div className="content"><section className="panel auth-empty"><div className="eyebrow">Your space</div><h1>Sign in to view your profile.</h1><p className="subtle">Your account keeps your identity and learning workspace together.</p><Link href="/auth" className="button primary">Sign in or sign up</Link></section></div>;
  return <ProfileEditor user={user} signOut={signOut}/>;
}

function ProfileEditor({ user, signOut }: { user: NonNullable<ReturnType<typeof useAuth>["user"]>; signOut: () => void }) {
  const { updateDisplayName, deleteAccount } = useAuth();
  const [details, setDetails] = useState<ProfileDetails>(() => getProfileDetails());
  const [displayName, setDisplayName] = useState(user.name);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [linkErrors, setLinkErrors] = useState({ github: "", linkedin: "" });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const initials = user.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const avatarSource = details.avatarDataUrl || user.avatarUrl;

  useEffect(() => {
    const readProfile = () => setDetails(getProfileDetails());
    readProfile();
    window.addEventListener("dsa-profile-changed", readProfile);
    return () => window.removeEventListener("dsa-profile-changed", readProfile);
  }, []);

  useEffect(() => setDisplayName(user.name), [user.name]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextLinkErrors = { github: validateProfileUrl(details.githubUrl, "github") ?? "", linkedin: validateProfileUrl(details.linkedinUrl, "linkedin") ?? "" };
    setLinkErrors(nextLinkErrors);
    if (nextLinkErrors.github || nextLinkErrors.linkedin) { setNotice("Please fix the profile links before saving."); return; }
    setSaving(true);
    setNotice("");
    try {
      await updateDisplayName(displayName);
      saveProfileDetails(details);
      setEditing(false);
      setNotice("Profile updated successfully.");
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "Could not update your profile.");
    } finally {
      setSaving(false);
    }
  }

  function uploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setNotice("Choose an image file for your avatar."); return; }
    if (file.size > 2 * 1024 * 1024) { setNotice("Please choose an image smaller than 2 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const next = { ...details, avatarDataUrl: String(reader.result) };
      setDetails(next);
      saveProfileDetails(next);
      setNotice("Avatar updated.");
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function removeAvatar() {
    const next = { ...details, avatarDataUrl: "" };
    setDetails(next);
    saveProfileDetails(next);
    setNotice("Avatar removed.");
  }

  function cancelEditing() {
    setDetails(getProfileDetails());
    setDisplayName(user.name);
    setLinkErrors({ github: "", linkedin: "" });
    setEditing(false);
    setNotice("");
  }

  function setLink(kind: "githubUrl" | "linkedinUrl", value: string) {
    setDetails({ ...details, [kind]: value });
    setLinkErrors({ ...linkErrors, [kind === "githubUrl" ? "github" : "linkedin"]: "" });
    setNotice("");
  }

  function openDeleteDialog() {
    setDeletePassword("");
    setDeleteError("");
    setDeleteDialogOpen(true);
  }

  async function confirmDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteAccount(deletePassword);
      window.location.assign("/auth");
    } catch (reason) {
      setDeleteError(reason instanceof Error ? reason.message : "Could not delete your account.");
    } finally {
      setDeleting(false);
    }
  }

  return <div className="content">
    <div className="page-heading"><div><div className="eyebrow">Your space</div><h1>Profile &amp; settings</h1><div className="subtle">Personalize how you show up while you learn.</div></div><button className="button" onClick={signOut}>Log out</button></div>
    <div className="profile-grid">
      <section className="panel profile-card">
        <div className="profile-card-header"><div className="profile-avatar-wrap">{avatarSource ? <img className="profile-avatar-large" src={avatarSource} alt={`${user.name} profile avatar`}/> : <div className="profile-avatar-large profile-avatar-fallback">{initials}</div>}<label className="avatar-edit-button" htmlFor="avatar-upload" title="Upload a profile image">+</label><input id="avatar-upload" className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={uploadAvatar}/></div><div className="profile-identity"><div className="eyebrow">Profile</div><h2>{user.name}</h2><p className="subtle">{user.email}</p><span className="auth-provider-label">Signed in with {user.provider === "local" ? "email" : user.provider}.</span></div></div>
        <div className="profile-avatar-actions"><label className="button" htmlFor="avatar-upload">Upload image</label>{details.avatarDataUrl && <button className="button ghost" type="button" onClick={removeAvatar}>Remove image</button>}<span className="subtle">PNG, JPG, WEBP or GIF - 2 MB max</span></div>
      </section>

      <section className="panel profile-settings">
        <div className="panel-heading"><div><h2>Public profile</h2><div className="subtle">Your display name and links are visible in your learning workspace.</div></div><button className="button" type="button" onClick={() => { setEditing(true); setNotice(""); }}>{editing ? "Editing" : "Edit profile"}</button></div>
        {editing ? <form className="profile-edit-form" onSubmit={save}>
          <label className="profile-field">Display name<input value={displayName} onChange={event => setDisplayName(event.target.value)} minLength={2} maxLength={60} required autoFocus/></label>
          <label className="profile-field">GitHub profile<div className="profile-input-wrap"><input type="url" value={details.githubUrl} onChange={event => setLink("githubUrl", event.target.value)} onBlur={() => setLinkErrors({ ...linkErrors, github: validateProfileUrl(details.githubUrl, "github") ?? "" })} placeholder="https://github.com/username" aria-invalid={Boolean(linkErrors.github)}/>{linkErrors.github && <span className="profile-field-error">{linkErrors.github}</span>}</div></label>
          <label className="profile-field">LinkedIn profile<div className="profile-input-wrap"><input type="url" value={details.linkedinUrl} onChange={event => setLink("linkedinUrl", event.target.value)} onBlur={() => setLinkErrors({ ...linkErrors, linkedin: validateProfileUrl(details.linkedinUrl, "linkedin") ?? "" })} placeholder="https://linkedin.com/in/username" aria-invalid={Boolean(linkErrors.linkedin)}/>{linkErrors.linkedin && <span className="profile-field-error">{linkErrors.linkedin}</span>}</div></label>
          <p className="profile-validation-note">Only official github.com and linkedin.com profile URLs are accepted.</p>
          {notice && <div className={notice.includes("successfully") || notice.includes("updated") || notice.includes("removed") ? "auth-message" : "auth-error"}>{notice}</div>}
          <div className="profile-form-actions"><button className="button ghost" type="button" onClick={cancelEditing}>Cancel</button><button className="button primary" type="submit" disabled={saving}>{saving ? "Saving..." : "Save changes"}</button></div>
        </form> : <div className="profile-info-list"><div className="profile-info-row"><span>Display name</span><strong>{user.name}</strong></div><div className="profile-info-row"><span>GitHub</span>{details.githubUrl ? <a href={details.githubUrl} target="_blank" rel="noreferrer">{details.githubUrl.replace(/^https?:\/\//, "")}</a> : <em>Not added</em>}</div><div className="profile-info-row"><span>LinkedIn</span>{details.linkedinUrl ? <a href={details.linkedinUrl} target="_blank" rel="noreferrer">{details.linkedinUrl.replace(/^https?:\/\//, "")}</a> : <em>Not added</em>}</div>{notice && <div className="auth-message">{notice}</div>}</div>}
      </section>

      <section className="panel profile-preferences"><div><div className="eyebrow">Appearance</div><h2>Theme</h2><p className="subtle">Choose the look that feels comfortable for your practice sessions.</p></div><ThemeToggle/></section>
      <section className="panel profile-danger-zone"><div><div className="eyebrow">Danger zone</div><h2>Delete account</h2><p className="subtle">Permanently remove your account, profile, submissions, and solved history from this browser.</p></div><button className="button danger-button" type="button" onClick={openDeleteDialog}>Delete account</button></section>
    </div>
    {deleteDialogOpen && <div className="modal-backdrop" role="presentation"><form className="panel account-delete-dialog" onSubmit={confirmDelete} role="dialog" aria-modal="true" aria-labelledby="delete-account-title"><div className="eyebrow">Final confirmation</div><h2 id="delete-account-title">Delete your account?</h2><p className="subtle">This cannot be undone. Enter your current login password to permanently delete the account and its learning history.</p><label className="profile-field">Current login password<input type="password" value={deletePassword} onChange={event => { setDeletePassword(event.target.value); setDeleteError(""); }} autoFocus autoComplete="current-password" required /></label>{deleteError && <div className="auth-error">{deleteError}</div>}<div className="profile-form-actions"><button className="button ghost" type="button" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>Cancel</button><button className="button danger-button" type="submit" disabled={deleting || !deletePassword}>{deleting ? "Deleting..." : "Delete permanently"}</button></div></form></div>}
  </div>;
}
