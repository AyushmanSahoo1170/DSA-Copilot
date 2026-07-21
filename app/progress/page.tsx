"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../components/auth-provider";
import { clearCurrentAccountData } from "../../lib/account-data";
import { readSubmissions } from "../../lib/activity";
import { getProblem, problems } from "../../lib/problems";

type Submission = { id: string; problemId: string; language: string; verdict: string; passed: number; total: number; firstTry: boolean; createdAt: string; durationMinutes?: number };

export default function Progress() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  useEffect(() => {
    const read = () => setSubmissions(readSubmissions() as Submission[]);
    read();
    window.addEventListener("submission-created", read);
    window.addEventListener("storage", read);
    window.addEventListener("dsa-auth-changed", read);
    return () => {
      window.removeEventListener("submission-created", read);
      window.removeEventListener("storage", read);
      window.removeEventListener("dsa-auth-changed", read);
    };
  }, [user?.id]);

  const solved = useMemo(() => new Set(submissions.filter((submission) => submission.verdict === "correct").map((submission) => submission.problemId)), [submissions]);
  const accepted = submissions.filter((submission) => submission.verdict === "correct");
  const firstTry = submissions.filter((submission) => submission.firstTry && submission.verdict === "correct");
  const topics = Array.from(new Set(problems.flatMap((problem) => problem.topics)));
  const topicScores = topics.map((topic) => {
    const attempts = submissions.filter((submission) => getProblem(submission.problemId).topics.includes(topic));
    const passes = attempts.filter((submission) => submission.verdict === "correct").length;
    return { topic, attempts: attempts.length, score: attempts.length ? Math.round((passes / attempts.length) * 100) : 0 };
  });
  const attemptedTopics = topicScores.filter((item) => item.attempts > 0);
  const overall = attemptedTopics.length ? Math.round(attemptedTopics.reduce((sum, item) => sum + item.score, 0) / attemptedTopics.length) : 0;
  const accuracy = submissions.length ? Math.round((accepted.length / submissions.length) * 100) : 0;
  const clear = () => { clearCurrentAccountData(); setSubmissions([]); window.dispatchEvent(new Event("dsa-solved")); window.dispatchEvent(new Event("submission-created")); };

  return <div className="content"><div className="page-heading"><div><div className="eyebrow">Your learning signal</div><h1>Progress</h1><div className="subtle">Every review is recorded here so your practice history stays meaningful.</div></div><button className="button ghost" onClick={clear} disabled={!submissions.length}>Reset local history</button></div><div className="grid stats"><Stat label="Overall mastery" value={`${overall}%`} detail={`${solved.size} problem${solved.size === 1 ? "" : "s"} solved`} /><Stat label="AI-reviewed accuracy" value={`${accuracy}%`} detail={`${accepted.length} accepted submission${accepted.length === 1 ? "" : "s"}`} /><Stat label="First-try accuracy" value={`${submissions.length ? Math.round((firstTry.length / submissions.length) * 100) : 0}%`} detail={`${firstTry.length} solved on first attempt`} neutral /><Stat label="Total submissions" value={`${submissions.length}`} detail="Stored for this account" neutral /></div><section className="panel" style={{ marginTop: 16 }}><div className="panel-heading"><div><h2>Topic breakdown</h2><div className="subtle">Scores are calculated from your AI-reviewed submissions.</div></div></div><div className="topic-list">{topicScores.map((item) => <div className="topic-row" key={item.topic}><span className="topic-name">{item.topic}</span><div className="bar"><span style={{ width: `${item.score}%` }} /></div><span className="topic-score">{item.attempts ? `${item.score}%` : "-"}</span></div>)}</div></section><section className="panel submission-history"><div className="panel-heading"><div><h2>Submission history</h2><div className="subtle">Most recent attempts first.</div></div></div>{submissions.length ? <div className="submission-list">{submissions.slice(0, 12).map((submission) => <div className="submission-row" key={submission.id}><div><strong>{getProblem(submission.problemId).title}</strong><span>{submission.language.toUpperCase()} - {new Date(submission.createdAt).toLocaleString()}</span></div><div className="submission-result"><span className={submission.verdict === "correct" ? "console-success" : "console-error"}>{submission.verdict === "correct" ? "Accepted" : "Needs work"}</span><small>{submission.passed}/{submission.total} tests</small></div></div>)}</div> : <div className="empty-history"><div className="eyebrow">No submissions yet</div><p className="subtle">Submit an attempt from a problem workspace and your mastery will start here.</p></div>}</section></div>;
}

function Stat({ label, value, detail, neutral = false }: { label: string; value: string; detail: string; neutral?: boolean }) {
  return <div className="stat-card"><div className="stat-top"><span>{label}</span><span>↗</span></div><div className="stat-value">{value}</div><div className={`stat-delta ${neutral ? "neutral" : ""}`}>{detail}</div></div>;
}
