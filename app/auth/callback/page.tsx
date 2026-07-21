"use client";
import { useEffect, useState } from "react";
import { completeOAuthCallback } from "../../../components/auth-provider";
export default function AuthCallbackPage() { const [error, setError] = useState(""); useEffect(() => { completeOAuthCallback().then(() => window.location.replace("/"), (reason) => setError(reason instanceof Error ? reason.message : "Could not complete sign-in.")); }, []); return <main className="auth-page"><section className="auth-card auth-loading"><div className="brand-mark">⌁</div><h1>{error ? "Sign-in could not be completed." : "Finishing sign-in…"}</h1>{error ? <><p className="auth-error">{error}</p><a className="button" href="/auth">Back to sign in</a></> : <p className="subtle">Returning you to your DSA workspace.</p>}</section></main>; }
