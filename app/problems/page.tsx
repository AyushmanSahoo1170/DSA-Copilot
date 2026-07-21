"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { problems } from "../../lib/problems";
import { readSolvedSlugs } from "../../lib/activity";

export default function Problems() {
  const [topic, setTopic] = useState("All topics");
  const [difficulty, setDifficulty] = useState("All difficulties");
  const [status, setStatus] = useState("All problems");
  const [query, setQuery] = useState("");
  const [solvedSlugs, setSolvedSlugs] = useState<string[]>([]);
  useEffect(() => {
    const readSolved = () => setSolvedSlugs(readSolvedSlugs());
    readSolved();
    window.addEventListener("dsa-solved", readSolved);
    window.addEventListener("dsa-auth-changed", readSolved);
    return () => { window.removeEventListener("dsa-solved", readSolved); window.removeEventListener("dsa-auth-changed", readSolved); };
  }, []);
  const filtered = useMemo(() => problems.filter(problem => {
    const matchesTopic = topic === "All topics" || problem.topics.includes(topic);
    const matchesDifficulty = difficulty === "All difficulties" || problem.difficulty === difficulty.toLowerCase();
    const matchesStatus = status === "All problems" || (status === "Solved" ? solvedSlugs.includes(problem.slug) : !solvedSlugs.includes(problem.slug));
    const matchesQuery = !query.trim() || `${problem.title} ${problem.topics.join(" ")}`.toLowerCase().includes(query.toLowerCase());
    return matchesTopic && matchesDifficulty && matchesStatus && matchesQuery;
  }), [topic, difficulty, status, query, solvedSlugs]);
  const resetFilters = () => { setTopic("All topics"); setDifficulty("All difficulties"); setStatus("All problems"); setQuery(""); };
  return <div className="content"><div className="page-heading"><div><div className="eyebrow">Practice library</div><h1>Problems</h1><div className="subtle">Build intuition one pattern at a time.</div></div><span className="subtle">{filtered.length} of {problems.length} problems</span></div><div className="problem-layout"><aside className="panel filter-panel"><div className="filter-title">Filter problems</div><label className="filter-label" htmlFor="problem-search">Search</label><input className="filter-input" id="problem-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by title or topic"/><FilterSelect label="Topic" value={topic} onChange={setTopic} options={["All topics", "Linked List", "Stack", "Binary Tree", "Graph BFS", "Binary Search", "Sorting"]}/><FilterSelect label="Difficulty" value={difficulty} onChange={setDifficulty} options={["All difficulties", "Easy", "Medium", "Hard"]}/><FilterSelect label="Status" value={status} onChange={setStatus} options={["All problems", "Solved", "Unsolved"]}/><button className="button ghost filter-reset" onClick={resetFilters}>Clear filters</button></aside><section>{filtered.length === 0 ? <div className="panel empty-state"><div className="eyebrow">No match</div><h2>Try a wider search.</h2><p className="subtle">There are no problems with that combination of filters.</p><button className="button" onClick={resetFilters}>Reset filters</button></div> : filtered.map(problem => { const solved = solvedSlugs.includes(problem.slug); return <Link href={`/problems/${problem.slug}`} className="problem-card" key={problem.slug}><div><div className={`difficulty ${problem.difficulty}`}>{problem.difficulty.toUpperCase()}</div><div className="problem-title">{problem.title}</div><div className="problem-meta"><span>{solved ? "Solved" : "Not started"}</span><span>•</span><div className="tags">{problem.topics.map(topicName => <span className="tag" key={topicName}>{topicName}</span>)}</div></div></div><span className="solved">{solved ? "✓" : ""}</span></Link>; })}</section></div></div>;
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) { return <label className="filter-section filter-control"><span className="filter-label">{label}</span><select className="filter-input" value={value} onChange={event => onChange(event.target.value)} aria-label={label}>{options.map(option => <option key={option}>{option}</option>)}</select></label>; }
