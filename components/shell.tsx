"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "./auth-provider";
import { getProfileDetails } from "../lib/profile";
import { getCurrentStreak, readSubmissions } from "../lib/activity";

const links = [["⌂", "Overview", "/"], ["◇", "Problems", "/problems"], ["↗", "Adaptive practice", "/practice/adaptive"], ["◷", "Progress", "/progress"]] as const;

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState("");
  const [streak, setStreak] = useState(0);
  const initials = user?.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "AR";

  useEffect(() => {
    const readProfile = () => setAvatarUrl(getProfileDetails().avatarDataUrl);
    readProfile();
    window.addEventListener("dsa-profile-changed", readProfile);
    window.addEventListener("dsa-auth-changed", readProfile);
    return () => { window.removeEventListener("dsa-profile-changed", readProfile); window.removeEventListener("dsa-auth-changed", readProfile); };
  }, []);

  useEffect(() => {
    const refreshStreak = () => setStreak(getCurrentStreak(readSubmissions()));
    refreshStreak();
    const timer = window.setInterval(refreshStreak, 60_000);
    window.addEventListener("submission-created", refreshStreak);
    window.addEventListener("submission-duration-updated", refreshStreak);
    window.addEventListener("dsa-auth-changed", refreshStreak);
    window.addEventListener("storage", refreshStreak);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("submission-created", refreshStreak);
      window.removeEventListener("submission-duration-updated", refreshStreak);
      window.removeEventListener("dsa-auth-changed", refreshStreak);
      window.removeEventListener("storage", refreshStreak);
    };
  }, []);

  return <div className="app-shell">
    <aside className="sidebar">
      <Link href="/" className="brand"><span className="brand-mark">⌁</span><span className="brand-text">DSA Copilot</span></Link>
      <div className="nav-group"><div className="nav-label">Workspace</div>{links.map(([icon, label, href]) => <Link key={href} href={href} className={pathname === href || (href !== "/" && pathname.startsWith(href)) ? "nav-link active" : "nav-link"}><span className="nav-icon">{icon}</span><span>{label}</span></Link>)}</div>
      <div className="nav-group"><div className="nav-label">Your space</div><Link href="/profile" className={pathname.startsWith("/profile") ? "nav-link active" : "nav-link"}><span className="nav-icon">◉</span><span>Profile &amp; settings</span></Link></div>
      <div className="streak"><div className="streak-row"><span className="eyebrow">Learning streak</span><span>✦</span></div><div className="streak-number">{streak} {streak === 1 ? "day" : "days"}</div><small>{streak ? "Keep the momentum going." : "Submit today to start."}</small></div>
    </aside>
    <main className="main">
      <header className="topbar"><div className="breadcrumbs"><span>Workspace</span><span>/</span><strong>{pathname === "/" ? "Overview" : pathname.split("/").filter(Boolean).pop()?.replaceAll("-", " ") || "Workspace"}</strong></div><div className="top-actions"><button className="icon-button" aria-label="Notifications">♧</button>{loading ? <div className="avatar">…</div> : user ? <><Link href="/profile" className="top-user">{user.name}</Link><div className="avatar">{avatarUrl ? <img className="avatar-image" src={avatarUrl} alt="Profile" /> : initials}</div><button className="button ghost logout-button" onClick={signOut}>Log out</button></> : <Link href="/auth" className="button primary">Sign in</Link>}</div></header>
      {children}
    </main>
  </div>;
}
