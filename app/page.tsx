"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useAuth } from "../components/auth-provider";
import { problems } from "../lib/problems";
import { dayKey, formatStudyTime, getActivityCounts, getCurrentStreak, readSubmissions } from "../lib/activity";
import type { ActivitySubmission } from "../lib/activity";

const cubePositions = [[108, 91], [166, 74], [226, 108], [285, 83], [346, 124], [406, 98], [146, 148], [206, 168], [267, 143], [326, 177], [382, 158], [443, 137], [95, 211], [156, 228], [220, 198], [280, 226], [344, 210], [404, 238], [132, 279], [192, 302], [258, 276], [318, 301], [375, 274], [430, 286]];
const topicNames = Array.from(new Set(problems.flatMap((problem) => problem.topics)));

type DashboardSubmission = ActivitySubmission & { problemId: string; verdict?: string; createdAt: string; durationMinutes?: number; language?: string };
type ActivityMap = Record<string, number>;

export default function Dashboard() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [submissions, setSubmissions] = useState<DashboardSubmission[]>([]);

  useEffect(() => {
    const refresh = () => setSubmissions(readSubmissions() as DashboardSubmission[]);
    refresh();
    window.addEventListener("submission-created", refresh);
    window.addEventListener("submission-duration-updated", refresh);
    window.addEventListener("dsa-auth-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("submission-created", refresh);
      window.removeEventListener("submission-duration-updated", refresh);
      window.removeEventListener("dsa-auth-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  useEffect(() => {
    const refreshDate = () => setCurrentDate(new Date());
    refreshDate();
    const timer = window.setInterval(refreshDate, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const dashboard = useMemo(() => {
    const referenceDate = currentDate ?? new Date();
    const activity = getActivityCounts(submissions);
    const accepted = submissions.filter((submission) => submission.verdict === "correct");
    const solvedIds = new Set(accepted.map((submission) => submission.problemId));
    const totalStudyMinutes = submissions.reduce((total, submission) => total + (Number(submission.durationMinutes) || 0), 0);

    const topicStats = topicNames.map((topic) => {
      const related = submissions.filter((submission) => problems.find((problem) => problem.slug === submission.problemId)?.topics.includes(topic));
      const passes = related.filter((submission) => submission.verdict === "correct").length;
      return { name: topic, attempts: related.length, score: related.length ? Math.round((passes / related.length) * 100) : 0 };
    });
    const attemptedTopics = topicStats.filter((topic) => topic.attempts > 0);
    const focusTopic = [...attemptedTopics].sort((a, b) => a.score - b.score || b.attempts - a.attempts)[0];
    const overallMastery = attemptedTopics.length ? Math.round(attemptedTopics.reduce((sum, topic) => sum + topic.score, 0) / attemptedTopics.length) : 0;

    const trendDates = Array.from({ length: 30 }, (_, index) => {
      const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
      date.setDate(date.getDate() - (29 - index));
      return date;
    });
    const trendValues = trendDates.map((date) => {
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999).getTime();
      const windowSubmissions = submissions.filter((submission) => {
        const timestamp = new Date(submission.createdAt).getTime();
        return !Number.isNaN(timestamp) && timestamp <= endOfDay && timestamp >= trendDates[0].getTime();
      });
      const passed = windowSubmissions.filter((submission) => submission.verdict === "correct").length;
      return windowSubmissions.length ? Math.round((passed / windowSubmissions.length) * 100) : 0;
    });
    const chartPoints = trendValues.map((value, index) => `${((index / (trendValues.length - 1)) * 720).toFixed(1)} ${(170 - value * 1.5).toFixed(1)}`);
    const chartLine = `M${chartPoints.join(" L")}`;
    const chartArea = `${chartLine} L720 190 L0 190Z`;

    const radarCenter = { x: 170, y: 140 };
    const radarRadius = 94;
    const radarPoint = (index: number, radius: number) => {
      const angle = -Math.PI / 2 + (index / Math.max(topicStats.length, 1)) * Math.PI * 2;
      return `${(radarCenter.x + Math.cos(angle) * radius).toFixed(1)},${(radarCenter.y + Math.sin(angle) * radius).toFixed(1)}`;
    };
    const radarGrid = [25, 50, 75, 100].map((level) => topicStats.map((_, index) => radarPoint(index, radarRadius * level / 100)).join(" "));
    const radarAxes = topicStats.map((_, index) => radarPoint(index, radarRadius));
    const radarData = topicStats.map((topic, index) => radarPoint(index, radarRadius * topic.score / 100)).join(" ");
    const radarLabels = topicStats.map((topic, index) => {
      const angle = -Math.PI / 2 + (index / Math.max(topicStats.length, 1)) * Math.PI * 2;
      const x = Number((radarCenter.x + Math.cos(angle) * (radarRadius + 19)).toFixed(2));
      const y = Number((radarCenter.y + Math.sin(angle) * (radarRadius + 19)).toFixed(2));
      return { name: topic.name, score: topic.score, x, y, anchor: x < radarCenter.x - 8 ? "end" : x > radarCenter.x + 8 ? "start" : "middle" };
    });

    const languageColors = ["#9b8afb", "#5cd1a5", "#f3b45c", "#ff758f", "#65b7ff"];
    const languageCounts = submissions.reduce<Record<string, number>>((counts, submission) => {
      const language = String(submission.language ?? "unknown").toLowerCase();
      counts[language] = (counts[language] ?? 0) + 1;
      return counts;
    }, {});
    const languageTotal = Object.values(languageCounts).reduce((sum, count) => sum + count, 0);
    let languageOffset = 0;
    const languageStats = Object.entries(languageCounts).sort(([, a], [, b]) => b - a).map(([language, count], index) => {
      const percentage = languageTotal ? Math.round((count / languageTotal) * 100) : 0;
      const start = languageOffset;
      languageOffset += (count / Math.max(languageTotal, 1)) * 360;
      return { language, label: language === "python" ? "Python" : language === "java" ? "Java" : language === "c" ? "C" : language.toUpperCase(), count, percentage, color: languageColors[index % languageColors.length], start, end: languageOffset };
    });
    const languagePie = languageStats.length ? `conic-gradient(${languageStats.map((item) => `${item.color} ${item.start}deg ${item.end}deg`).join(", ")})` : "conic-gradient(var(--surface-soft) 0 360deg)";

    return {
      streak: getCurrentStreak(submissions, referenceDate), solvedCount: solvedIds.size, acceptedCount: accepted.length, focusTopic, totalStudyMinutes,
      topicStats, overallMastery, chartLine, chartArea, latestTrendValue: trendValues[trendValues.length - 1] ?? 0,
      chartDates: [trendDates[0], trendDates[14], trendDates[29]], radarGrid, radarAxes, radarData, radarLabels, languageStats, languagePie,
      activity, monthLabel: referenceDate.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
    };
  }, [currentDate, submissions]);

  const dateLabel = currentDate?.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) ?? "Today";
  const displayName = user?.name?.trim() || "learner";
  const chartLabel = `Mastery trend across the last 30 days, currently ${dashboard.latestTrendValue} percent`;
  const referenceDate = currentDate ?? new Date();

  return <div className="content">
    <section className="spline-hero"><div className="hero-nav"><div className="hero-brand"><span className="hero-brand-mark">~</span><span>DSA Copilot</span></div><nav><Link href="/">Home</Link><Link href="/problems">Problems</Link><Link href="/practice/adaptive">Practice</Link><Link href="/progress">Progress</Link></nav><Link className="hero-login" href="/profile">Your profile <span>↗</span></Link></div><div className="hero-content"><div className="hero-copy"><div className="hero-kicker">Learn by thinking - one concept at a time</div><h2>Build a sharper<br />mind for DSA.</h2><p>Practice data structures with a patient AI tutor that helps you see the next step without giving away the answer.</p><div className="hero-actions"><Link className="hero-button hero-button-primary" href="/practice/adaptive">Start practicing <span>›</span></Link><Link className="hero-button hero-button-secondary" href="/problems">Explore problems <span>›</span></Link></div></div><div className="hero-scene" aria-label="Glowing algorithm nodes forming a connected data structure" role="img"><div className="scene-haze" />{cubePositions.map(([left, top], index) => <span key={index} className={`scene-cube cube-${index % 8}`} style={{ "--i": index, left, top } as CSSProperties} />)}</div></div><div className="hero-scroll">Scroll to explore <span>v</span></div></section>

    <div className="page-heading"><div><div className="eyebrow">{dateLabel}</div><h1>Good morning, {displayName}.</h1><div className="subtle">Your next breakthrough is probably one careful question away.</div></div><Link className="button primary" href="/practice/adaptive">* <span>Start adaptive practice</span></Link></div>
    <div className="grid stats"><Stat label="Current streak" value={`${dashboard.streak} ${dashboard.streak === 1 ? "day" : "days"}`} detail={dashboard.streak ? "Based on daily activity" : "Submit today to start"} /><Stat label="Problems solved" value={`${dashboard.solvedCount}`} detail={`${dashboard.acceptedCount} accepted submission${dashboard.acceptedCount === 1 ? "" : "s"}`} /><Stat label="Focus topic" value={dashboard.focusTopic?.name ?? "Not started"} detail={dashboard.focusTopic ? `${dashboard.focusTopic.score}% mastery` : "Try your first problem"} neutral /><Stat label="Total study time" value={formatStudyTime(dashboard.totalStudyMinutes)} detail={submissions.length ? `${submissions.length} logged attempt${submissions.length === 1 ? "" : "s"}` : "Tracked from submit sessions"} /></div>

    <div className="grid dashboard-grid"><section className="panel"><div className="panel-heading"><div><h2>Mastery over time</h2><div className="subtle">Your confidence across the last 30 days</div></div><span className="tag">Last 30 days</span></div><svg className="chart" viewBox="0 0 720 190" role="img" aria-label={chartLabel}><defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#9b8afb" stopOpacity=".24" /><stop offset="1" stopColor="#9b8afb" stopOpacity="0" /></linearGradient></defs><path className="chart-grid" d="M0 20H720M0 70H720M0 120H720M0 170H720" /><path className="chart-area" d={dashboard.chartArea} /><path className="chart-line" d={dashboard.chartLine} /><text className="chart-label" x="0" y="188">{dashboard.chartDates[0].toLocaleDateString(undefined, { month: "short", day: "numeric" }).toUpperCase()}</text><text className="chart-label" x="340" y="188">{dashboard.chartDates[1].toLocaleDateString(undefined, { month: "short", day: "numeric" }).toUpperCase()}</text><text className="chart-label" x="674" y="188">{dashboard.chartDates[2].toLocaleDateString(undefined, { month: "short", day: "numeric" }).toUpperCase()}</text><text className="chart-label" x="686" y={170 - dashboard.latestTrendValue * 1.5 - 5}>{dashboard.latestTrendValue}%</text></svg><DailyActivity activity={dashboard.activity} referenceDate={referenceDate} /></section><section className="panel"><div className="panel-heading"><div><h2>Topic mastery</h2><div className="subtle">Calculated from your submissions</div></div><span className="eyebrow">{topicNames.length} topics</span></div><div className="topic-list">{dashboard.topicStats.map((topic) => <div className="topic-row" key={topic.name}><span className="topic-name">{topic.name}</span><div className="bar"><span style={{ width: `${topic.score}%` }} /></div><span className="topic-score">{topic.attempts ? `${topic.score}%` : "-"}</span></div>)}</div><div className="mastery-summary">Overall mastery <strong>{dashboard.overallMastery}%</strong></div><Link href="/progress" className="button ghost" style={{ marginTop: 22, width: "100%", justifyContent: "center" }}>View detailed progress -&gt;</Link></section></div>

    <div className="grid insight-grid"><section className="panel"><div className="panel-heading"><div><h2>Topic radar</h2><div className="subtle">Your mastery shape by topic</div></div><span className="tag">Live</span></div><svg className="radar-chart" viewBox="0 0 340 285" role="img" aria-label="Spider graph showing topic mastery"><g className="radar-grid">{dashboard.radarGrid.map((points, index) => <polygon key={index} points={points} />)}</g><g className="radar-axes">{dashboard.radarAxes.map((point, index) => <line key={index} x1="170" y1="140" x2={point.split(",")[0]} y2={point.split(",")[1]} />)}</g><polygon className="radar-data" points={dashboard.radarData} />{dashboard.radarLabels.map((label) => <text key={label.name} className="radar-label" x={label.x} y={label.y} textAnchor={label.anchor as "start" | "middle" | "end"}><title>{`${label.name}: ${label.score}%`}</title>{label.name.length > 14 ? `${label.name.slice(0, 13)}...` : label.name}</text>)}</svg></section><section className="panel"><div className="panel-heading"><div><h2>Language mix</h2><div className="subtle">Most-used languages in your submissions</div></div><span className="tag">{dashboard.languageStats.length ? `${dashboard.languageStats.length} used` : "No data"}</span></div><div className="language-chart"><div className="language-pie" style={{ background: dashboard.languagePie }} role="img" aria-label="Pie chart of languages used"><span>{dashboard.languageStats.length ? `${dashboard.languageStats[0].percentage}%` : "0%"}</span></div><div className="language-legend">{dashboard.languageStats.length ? dashboard.languageStats.map((item) => <div className="language-row" key={item.language}><span className="language-dot" style={{ background: item.color }} /><span>{item.label}</span><strong>{item.percentage}%</strong><small>{item.count} submission{item.count === 1 ? "" : "s"}</small></div>) : <div className="empty-chart-state">Submit a solution to see your language mix.</div>}</div></div></section></div>
  </div>;
}

function DailyActivity({ activity, referenceDate }: { activity: ActivityMap; referenceDate: Date }) {
  const referenceKey = dayKey(referenceDate);
  const [selectedKey, setSelectedKey] = useState(referenceKey);
  useEffect(() => setSelectedKey(referenceKey), [referenceKey]);

  const { days, months, columns } = useMemo(() => {
    const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 11, 1);
    start.setDate(start.getDate() - start.getDay());
    const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
    end.setDate(end.getDate() + (6 - end.getDay()));
    const result: Date[] = [];
    for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) result.push(new Date(cursor));
    const monthMarks = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 11 + index, 1);
      const offset = Math.round((date.getTime() - start.getTime()) / 86_400_000);
      return { label: date.toLocaleDateString(undefined, { month: "short" }), column: Math.floor(offset / 7) };
    }).filter((mark, index, marks) => index === 0 || mark.column !== marks[index - 1].column);
    return { days: result, months: monthMarks, columns: Math.ceil(result.length / 7) };
  }, [referenceDate]);

  const selectedDate = days.find((date) => dayKey(date) === selectedKey) ?? referenceDate;
  const selectedCount = activity[selectedKey] ?? 0;
  const todayTime = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate()).getTime();
  const monthLabelsStyle = { gridTemplateColumns: `repeat(${columns}, 12px)` } as CSSProperties;
  const gridStyle = { gridTemplateRows: "repeat(7, 12px)", gridTemplateColumns: `repeat(${columns}, 12px)` } as CSSProperties;

  return <div className="daily-activity"><div className="daily-activity-heading"><div><h3>Daily activity</h3><div className="subtle">The last 12 months of runs and submissions</div></div><span className="tag">Through {referenceDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span></div><div className="activity-board"><div className="activity-weekdays activity-weekdays-vertical" aria-hidden="true"><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span></div><div className="activity-track"><div className="activity-month-labels" style={monthLabelsStyle}>{months.map((month) => <span key={`${month.label}-${month.column}`} style={{ gridColumn: month.column + 1 }}>{month.label}</span>)}</div><div className="activity-year-grid" style={gridStyle}>{days.map((date) => { const key = dayKey(date); const count = activity[key] ?? 0; const future = date.getTime() > todayTime; const level = count === 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : count <= 4 ? 3 : 4; return <button key={key} type="button" className={`activity-cell activity-button ${selectedKey === key ? "selected" : ""}`} data-level={level || undefined} disabled={future} aria-label={`${count} submissions on ${key}`} aria-pressed={selectedKey === key} title={`${date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}: ${count} submission${count === 1 ? "" : "s"}`} onClick={() => setSelectedKey(key)} />; })}</div></div></div><div className="activity-detail"><span><strong>{selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</strong> - {selectedCount} submission{selectedCount === 1 ? "" : "s"}</span><Link href="/progress" className="subtle">Open Progress -&gt;</Link></div><div className="activity-legend"><span>Less</span>{[0, 1, 2, 3, 4].map((level) => <i key={level} className="activity-cell" data-level={level || undefined} />)}<span>More</span></div></div>;
}

function Stat({ label, value, detail, neutral = false }: { label: string; value: string; detail: string; neutral?: boolean }) {
  return <div className="stat-card"><div className="stat-top"><span>{label}</span><span>↗</span></div><div className="stat-value">{value}</div><div className={`stat-delta ${neutral ? "neutral" : ""}`}>{detail}</div></div>;
}
