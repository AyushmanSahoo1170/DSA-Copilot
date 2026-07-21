"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getProblem, type Language, type Problem, type Visualization } from "../../../lib/problems";
import { readSolvedSlugs, readSubmissions, writeSolvedSlugs, writeSubmissions } from "../../../lib/activity";

type ComplexityResult = { time_complexity: string; space_complexity: string; reasoning: string; confidence: string };
type ReviewResult = { verdict: "correct" | "incorrect" | "partial"; hint: string; rationale?: string; passed_tests?: number; total_tests?: number; time_complexity?: string; space_complexity?: string; mistake_category?: string | null };
type HintMessage = { role: "user" | "assistant"; content: string };

export default function ProblemWorkspace({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const problem = getProblem(slug);
  const [language, setLanguage] = useState<Language>("c");
  const [codeByLanguage, setCodeByLanguage] = useState<Record<Language, string>>(problem.starterCode);
  const [running, setRunning] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [consoleLines, setConsoleLines] = useState<string[]>(["Type your approach, then run the sample tests."]);
  const [tab, setTab] = useState("Hints");
  const [step, setStep] = useState(1);
  const [hintInput, setHintInput] = useState("");
  const [hintLoading, setHintLoading] = useState(false);
  const [hintThread, setHintThread] = useState<HintMessage[]>([]);
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [complexity, setComplexity] = useState<ComplexityResult | null>(null);
  const [complexityLoading, setComplexityLoading] = useState(false);
  const code = codeByLanguage[language];
  const sessionStartedAt = useRef(Date.now());

  useEffect(() => {
    const addSessionDuration = () => {
      try {
        const saved = readSubmissions();
        const [latest, ...rest] = saved;
        if (!latest || latest.durationMinutes !== undefined) return;
        const durationMinutes = Math.max(1, Math.min(120, Math.round((Date.now() - sessionStartedAt.current) / 60000)));
        writeSubmissions([{ ...latest, durationMinutes }, ...rest]);
        sessionStartedAt.current = Date.now();
        window.dispatchEvent(new Event("submission-duration-updated"));
      } catch {
        // A malformed local history should not interrupt the workspace.
      }
    };

    window.addEventListener("submission-created", addSessionDuration);
    return () => window.removeEventListener("submission-created", addSessionDuration);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setReviewLoading(true);
      try { const response = await fetch("/api/ai/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, language, problemId: problem.slug }) }); setReview(await response.json()); } catch { setReview({ verdict: "partial", mistake_category: null, hint: "Keep going. Run the code when you have a first approach to review.", }); }
      setReviewLoading(false);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [code, language, problem.slug]);

  function updateCode(value: string) { setCodeByLanguage(previous => ({ ...previous, [language]: value })); setSubmitted(false); }
  function handleEditorKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    const target = event.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const indentation = "    ";
    const pairs: Record<string, string> = { "(": ")", "[": "]", "{": "}", "\"": "\"", "'": "'" };
    const closingCharacters = new Set(Object.values(pairs));
    const value = target.value;
    const setEditorValue = (nextValue: string, nextStart: number, nextEnd = nextStart) => {
      updateCode(nextValue);
      window.requestAnimationFrame(() => { target.selectionStart = nextStart; target.selectionEnd = nextEnd; });
    };

    if (event.key === "Tab") {
      event.preventDefault();
      if (start !== end) {
        const selected = value.slice(start, end);
        const nextSelected = event.shiftKey
          ? selected.split("\n").map(line => line.startsWith(indentation) ? line.slice(indentation.length) : line.startsWith("\t") ? line.slice(1) : line).join("\n")
          : selected.split("\n").map(line => indentation + line).join("\n");
        setEditorValue(value.slice(0, start) + nextSelected + value.slice(end), start, start + nextSelected.length);
        return;
      }
      if (event.shiftKey) {
        const lineStart = value.lastIndexOf("\n", start - 1) + 1;
        const beforeCursor = value.slice(lineStart, start);
        const removeLength = beforeCursor.endsWith(indentation) ? indentation.length : beforeCursor.endsWith("\t") ? 1 : 0;
        if (removeLength) setEditorValue(value.slice(0, start - removeLength) + value.slice(start), start - removeLength);
      } else {
        setEditorValue(value.slice(0, start) + indentation + value.slice(end), start + indentation.length);
      }
      return;
    }

    if (!event.ctrlKey && !event.metaKey && !event.altKey && start === end && closingCharacters.has(event.key) && value[start] === event.key) {
      event.preventDefault();
      window.requestAnimationFrame(() => { target.selectionStart = target.selectionEnd = start + 1; });
      return;
    }

    if (event.key === "Backspace" && start === end && start > 0 && pairs[value[start - 1]] === value[start]) {
      event.preventDefault();
      setEditorValue(value.slice(0, start - 1) + value.slice(start + 1), start - 1);
      return;
    }

    if (!event.ctrlKey && !event.metaKey && !event.altKey && pairs[event.key]) {
      event.preventDefault();
      const closing = pairs[event.key];
      if (start !== end) {
        const selected = value.slice(start, end);
        setEditorValue(value.slice(0, start) + event.key + selected + closing + value.slice(end), start + 1, end + 1);
      } else {
        setEditorValue(value.slice(0, start) + event.key + closing + value.slice(end), start + 1);
      }
      return;
    }

    if (event.key !== "Enter") return;
    event.preventDefault();
    const before = value.slice(0, start);
    const after = value.slice(end);
    const lineStart = before.lastIndexOf("\n") + 1;
    const currentLine = before.slice(lineStart);
    const lineIndent = currentLine.match(/^[ \t]*/)?.[0] ?? "";
    const trimmedLine = currentLine.trim();
    const previousCharacter = before.slice(-1);
    const matchingClose = pairs[previousCharacter];
    const expandsPair = matchingClose && after.startsWith(matchingClose);
    const opensBlock = language === "python"
      ? trimmedLine.endsWith(":")
      : trimmedLine.endsWith("{") || trimmedLine.endsWith("[") || trimmedLine.endsWith("(");
    const closesBlock = /^[}\])]/.test(trimmedLine);
    const baseIndent = closesBlock && lineIndent.length >= indentation.length ? lineIndent.slice(0, -indentation.length) : lineIndent;

    if (expandsPair) {
      const innerIndent = lineIndent + indentation;
      const nextValue = before + "\n" + innerIndent + "\n" + lineIndent + after;
      setEditorValue(nextValue, before.length + 1 + innerIndent.length);
      return;
    }

    const nextIndent = baseIndent + (opensBlock ? indentation : "");
    const nextValue = before + "\n" + nextIndent + after;
    setEditorValue(nextValue, before.length + 1 + nextIndent.length);
  }
  function changeLanguage(next: Language) { setLanguage(next); setSubmitted(false); setComplexity(null); setConsoleLines([`loaded ${next} starter template for ${problem.title}`]); }
  function resetCode() { setCodeByLanguage(problem.starterCode); setSubmitted(false); setReview(null); setComplexity(null); setHintThread([]); setConsoleLines(["reset to the unsolved starter template"]); }

  async function runCode() {
    setRunning(true); setSubmitted(false); setConsoleLines(["run ./solution --samples", "running sample tests…"]);
    try { const response = await fetch("/api/execute/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, language, problemId: problem.slug }) }); const result = await response.json(); const testLines = result.tests.map((test: { status: string; name: string; message: string }) => `${test.status === "passed" ? "✓" : "×"} ${test.name} · ${test.message}`); setConsoleLines(["Run Code · sample tests", ...testLines, `${result.verdict === "correct" ? "✓ Accepted" : "× Failed"} · ${result.passed} / ${result.total} tests`, `Runtime: ${result.runtime}`]); } catch { setConsoleLines(["Run Code · sample tests", "× Unable to reach the review assistant."]); }
    setRunning(false);
  }

  async function submitCode() {
    setRunning(true); setSubmitted(false); setConsoleLines(["submit ./solution", "reviewing your full attempt…"]);
    try { const response = await fetch("/api/execute/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, language, problemId: problem.slug }) }); const result = await response.json(); const accepted = result.verdict === "correct"; setSubmitted(accepted); const existing = readSubmissions(); const record = { id: `${Date.now()}-${problem.slug}`, problemId: problem.slug, language, verdict: result.verdict, passed: result.passed, total: result.total, firstTry: !existing.some(item => item.problemId === problem.slug), createdAt: new Date().toISOString() }; writeSubmissions([record, ...existing].slice(0, 100)); if (accepted) { const solved = readSolvedSlugs(); if (!solved.includes(problem.slug)) writeSolvedSlugs([...solved, problem.slug]); window.dispatchEvent(new Event("dsa-solved")); } window.dispatchEvent(new Event("submission-created")); const testLines = result.tests.map((test: { status: string; name: string; message: string }) => `${test.status === "passed" ? "✓" : "×"} ${test.name} · ${test.message}`); setConsoleLines(["Submit · all test cases", ...testLines, accepted ? `✓ Accepted · ${result.passed} / ${result.total} tests` : `× ${result.verdict} · ${result.passed} / ${result.total} tests`, accepted ? "Nice work. Check the complexity analysis next." : "Open Hints for a guiding question — no fixed answer will be shown."]); } catch { setConsoleLines(["Submit · all test cases", "× Unable to reach the review assistant."]); }
    setRunning(false);
  }

  async function analyzeComplexity() {
    setComplexityLoading(true);
    try { const response = await fetch("/api/ai/complexity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, language, problemId: problem.slug }) }); setComplexity(await response.json()); } catch { setComplexity({ time_complexity: "?", space_complexity: "?", reasoning: "The analyzer could not be reached. Try again.", confidence: "low" }); }
    setComplexityLoading(false);
  }

  async function askHint(event?: React.FormEvent) {
    event?.preventDefault(); const question = hintInput.trim() || "Give me one Socratic hint about my current approach."; setHintInput(""); setHintLoading(true); setHintThread(previous => [...previous, { role: "user", content: question }]);
    try { const response = await fetch("/api/ai/hint", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, language, problemId: problem.slug, question, hintThread }) }); const result = await response.json(); setHintThread(previous => [...previous, { role: "assistant", content: result.hint }]); } catch { setHintThread(previous => [...previous, { role: "assistant", content: "What value or state must you preserve before changing the current item?" }]); }
    setHintLoading(false);
  }

  const chooseTab = (next: string) => { setTab(next); if (next === "Complexity" && !complexity) void analyzeComplexity(); };
  return <div className="workspace">
    <div className="workspace-head"><div className="workspace-title"><Link href="/problems" className="subtle">← Problems</Link><h1>{problem.title}</h1><span className={`difficulty ${problem.difficulty}`}>{problem.difficulty.toUpperCase()}</span></div><div className="workspace-actions"><button className="button ghost" onClick={resetCode}>↶ <span>Reset</span></button><button className="button" disabled={running} onClick={runCode}>▶ <span>{running ? "Running…" : "Run"}</span></button><button className="button primary" disabled={running} onClick={submitCode}>Submit ↗</button></div></div>
    <div className="workspace-grid">
      <section className="workspace-pane statement"><PaneHeader label="Problem" right="⌘ K"/><div className="pane-body"><div className="tags">{problem.topics.map(topic => <span className="tag" key={topic}>{topic}</span>)}</div><h2>{problem.title}</h2><p>{problem.description}</p><h3>Example</h3><div className="example">{problem.examples.map(example => <div key={example}><span>{example.split(":")[0]}</span>{example.substring(example.indexOf(":") + 1)}</div>)}</div><h3>Constraints</h3><p>{problem.constraints.map(constraint => <span key={constraint} className="constraint-line">• {constraint}</span>)}</p><h3>Think about</h3><p className="subtle">Try a first approach in the editor. Copilot reviews your actual code and asks one focused question when it finds a gap.</p></div></section>
      <section className="workspace-pane editor"><div className="editor-toolbar"><span className="mono" style={{ fontSize: 11 }}>solution.{language === "python" ? "py" : language === "java" ? "java" : "c"}</span><select className="lang" value={language} onChange={event => changeLanguage(event.target.value as Language)} aria-label="Language"><option value="c">C</option><option value="python">Python</option><option value="java">Java</option></select></div><div className="editor-surface"><div className="line-numbers" aria-hidden="true">{code.split("\n").map((_, index) => <span key={index}>{index + 1}</span>)}</div><textarea className="code code-editor" value={code} onChange={event => updateCode(event.target.value)} onKeyDown={handleEditorKeyDown} spellCheck={false} aria-label={`${language} code editor`} /></div></section>
      <section className="workspace-pane console"><PaneHeader label="Test results" right={submitted ? "Accepted" : running ? "Running" : "Ready"}/><div className="console-body">{consoleLines.map((line, index) => <div key={`${line}-${index}`} className={line.startsWith("✓") ? "console-success" : line.startsWith("×") ? "console-error" : index === 0 ? "console-command" : ""}>{index < 2 && index === 0 && <span className="console-prompt">$ </span>}{line}</div>)}</div></section>
      <section className="workspace-pane copilot"><div className="tabs">{["Hints", "Complexity", "Visualize"].map(item => <button key={item} className={`tab ${tab === item ? "active" : ""}`} onClick={() => chooseTab(item)}>{item}{item === "Hints" && <span style={{ color: "var(--violet)", marginLeft: 5 }}>●</span>}</button>)}</div><CopilotContent tab={tab} problem={problem} step={step} setStep={setStep} hintThread={hintThread} hintInput={hintInput} setHintInput={setHintInput} hintLoading={hintLoading} askHint={askHint} review={review} reviewLoading={reviewLoading} complexity={complexity} complexityLoading={complexityLoading} analyzeComplexity={analyzeComplexity}/></section>
    </div>
  </div>;
}

function PaneHeader({ label, right }: { label: string; right: string }) { return <div className="pane-header"><span>{label}</span><span>{right}</span></div>; }
function CopilotContent({ tab, problem, step, setStep, hintThread, hintInput, setHintInput, hintLoading, askHint, review, reviewLoading, complexity, complexityLoading, analyzeComplexity }: { tab: string; problem: Problem; step: number; setStep: (n: number) => void; hintThread: HintMessage[]; hintInput: string; setHintInput: (value: string) => void; hintLoading: boolean; askHint: (event?: React.FormEvent) => void; review: ReviewResult | null; reviewLoading: boolean; complexity: ComplexityResult | null; complexityLoading: boolean; analyzeComplexity: () => void }) {
  if (tab === "Hints") return <div className="copilot-body"><div className="hint-thread"><div className={`live-review ${review?.verdict === "incorrect" ? "review-warn" : review?.verdict === "correct" ? "review-good" : ""}`}><div className="hint-label">LIVE AI REVIEW {reviewLoading ? "· READING…" : "· " + (review?.verdict?.toUpperCase() ?? "WAITING")}</div><div>{reviewLoading ? "Reviewing your latest edit…" : review?.hint ?? "Start typing or paste your attempt here."}</div>{review && <div className="review-meta">{review.passed_tests ?? 0} / {review.total_tests ?? 8} tests · {review.rationale ?? "Awaiting an explanation."}</div>}</div>{hintThread.map((message, index) => <div className={`chat ${message.role}`} key={`${message.role}-${index}`}><div className="chat-avatar">{message.role === "user" ? "You" : "✦"}</div><div className="chat-message"><div className="hint-label">{message.role === "user" ? "YOUR QUESTION" : "COPILOT · SOCRATIC HINT"}</div>{message.content}</div></div>)}{hintLoading && <div className="subtle">Copilot is thinking of one question…</div>}<form className="ask-box" onSubmit={askHint}><input value={hintInput} onChange={event => setHintInput(event.target.value)} placeholder="Ask about your approach…" aria-label="Ask for a Socratic hint"/><button className="button primary" disabled={hintLoading} type="submit">{hintLoading ? "Thinking…" : "Ask hint"}</button></form></div><div className="complexity"><Complexity label="Time" value={complexity?.time_complexity ?? "—"}/><Complexity label="Space" value={complexity?.space_complexity ?? "—"}/></div></div>;
  if (tab === "Complexity") return <div className="copilot-body"><div><div className="hint-label">COMPLEXITY ANALYSIS · {complexity?.confidence?.toUpperCase() ?? "READY"}</div><div className="complexity" style={{ marginTop: 12 }}><Complexity label="Time complexity" value={complexityLoading ? "…" : complexity?.time_complexity ?? "—"}/><Complexity label="Space complexity" value={complexityLoading ? "…" : complexity?.space_complexity ?? "—"}/></div><p className="subtle" style={{ marginTop: 17 }}>{complexityLoading ? "Reading the loops, recursion, and allocations in your current code…" : complexity?.reasoning ?? "Analyze the current code to see a complexity explanation."}</p><button className="button" onClick={analyzeComplexity} disabled={complexityLoading}>{complexityLoading ? "Analyzing…" : "Analyze current code"}</button></div></div>;
  return <Visualizer kind={problem.visualization} step={step} setStep={setStep}/>;
}
function Complexity({ label, value }: { label: string; value: string }) { return <div className="complexity-box"><label>{label}</label><b>{value}</b></div>; }

function Visualizer({ kind, step, setStep }: { kind: Visualization; step: number; setStep: (n: number) => void }) {
  const max = kind === "tree" || kind === "graph" ? 4 : 3;
  return <div className="copilot-body"><div className="visualizer"><div className="trace-toolbar"><button className="button" onClick={() => setStep(Math.max(0, step - 1))}>← Step</button><button className="button primary" onClick={() => setStep(step >= max ? 0 : step + 1)}>▶ Play</button><button className="button" onClick={() => setStep(Math.min(max, step + 1))}>Step →</button><span className="subtle">Step {step} of {max}</span></div><div className="visualizer-stage">{kind === "linked-list" && <LinkedListVisual step={step}/>} {kind === "stack" && <StackVisual step={step}/>} {kind === "tree" && <TreeVisual step={step}/>} {kind === "graph" && <GraphVisual step={step}/>} {kind === "array" && <ArrayVisual step={step}/>}</div><input className="range" type="range" min="0" max={max} value={step} onChange={event => setStep(Number(event.target.value))} aria-label="Visualization step"/><div className="trace-caption">{visualCaption(kind, step)}</div></div><div className="subtle">This canonical trace teaches the data-structure movement while your typed solution remains yours to debug.</div></div>;
}
function visualCaption(kind: Visualization, step: number) { const captions: Record<Visualization, string[]> = { "linked-list": ["Start at the head.", "Save the next node before changing the link.", "Reverse one pointer.", "Advance through the original list."], stack: ["The stack is empty.", "Push each opening bracket.", "Peek before matching a closer.", "Pop only when the pair matches."], tree: ["Begin at the root.", "Queue the root's children.", "Visit the next level.", "Expand the frontier left to right.", "The traversal is complete."], graph: ["Pick an unvisited land cell.", "Explore its neighbors.", "Mark visited cells to avoid repeats.", "Start a new island when needed.", "The count is complete."], array: ["The full array is the search space.", "Inspect the midpoint.", "Discard the half that cannot contain the target.", "The interval is narrowed."] }; return captions[kind][Math.min(step, captions[kind].length - 1)]; }
function LinkedListVisual({ step }: { step: number }) { return <div className="visual-row">{["1", "2", "3", "4", "5"].slice(Math.max(0, step - 1)).map((value, index) => <span className="visual-item" key={value}><span className={`viz-node ${index === 0 ? "active" : ""}`}>{value}</span>{index < 5 - step && <span className="viz-arrow">→</span>}</span>)}<span className="subtle">NULL</span></div>; }
function StackVisual({ step }: { step: number }) { return <div className="stack-visual">{["(", "[", "{"].slice(0, Math.max(1, step)).map((value, index) => <div className={`stack-block ${index === step - 1 ? "active" : ""}`} key={`${value}-${index}`}>{value}</div>)}</div>; }
function TreeVisual({ step }: { step: number }) { return <svg className="viz-svg" viewBox="0 0 430 150" role="img" aria-label="Binary tree traversal visualization"><path className="tree-edge" d="M215 35L125 85M215 35L305 85M125 85L80 130M125 85L170 130M305 85L260 130M305 85L350 130"/><TreeNode x={215} y={25} value="3" active={step >= 0}/><TreeNode x={125} y={75} value="9" active={step >= 1}/><TreeNode x={305} y={75} value="20" active={step >= 1}/><TreeNode x={80} y={120} value="4" active={step >= 2}/><TreeNode x={170} y={120} value="8" active={step >= 2}/><TreeNode x={260} y={120} value="15" active={step >= 3}/><TreeNode x={350} y={120} value="7" active={step >= 4}/></svg>; }
function TreeNode({ x, y, value, active }: { x: number; y: number; value: string; active: boolean }) { return <g><circle className={`tree-node ${active ? "active" : ""}`} cx={x} cy={y} r="16"/><text className="tree-label" x={x} y={y + 4} textAnchor="middle">{value}</text></g>; }
function GraphVisual({ step }: { step: number }) { return <svg className="viz-svg" viewBox="0 0 430 150" role="img" aria-label="Graph breadth-first traversal visualization"><path className="graph-edge" d="M70 75L175 35M70 75L175 115M175 35L300 55M175 115L300 105M300 55L370 85M300 105L370 85"/><GraphNode x={70} y={75} label="A" active={step >= 0}/><GraphNode x={175} y={35} label="B" active={step >= 1}/><GraphNode x={175} y={115} label="C" active={step >= 1}/><GraphNode x={300} y={55} label="D" active={step >= 2}/><GraphNode x={300} y={105} label="E" active={step >= 3}/><GraphNode x={370} y={85} label="F" active={step >= 4}/></svg>; }
function GraphNode({ x, y, label, active }: { x: number; y: number; label: string; active: boolean }) { return <g><circle className={`graph-node ${active ? "active" : ""}`} cx={x} cy={y} r="18"/><text className="tree-label" x={x} y={y + 4} textAnchor="middle">{label}</text></g>; }
function ArrayVisual({ step }: { step: number }) { const values = [1, 3, 5, 7, 9, 12]; const active = step === 0 ? 2 : step === 1 ? 4 : step === 2 ? 5 : 4; return <div className="array-visual">{values.map((value, index) => <div className={`array-cell ${index === active ? "active" : index < active && step > 1 ? "muted" : ""}`} key={value}><span>{value}</span><small>{index}</small></div>)}</div>; }
