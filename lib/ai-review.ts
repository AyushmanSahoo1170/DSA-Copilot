import { getProblem } from "./problems";
import { isLikelyCorrect } from "./evaluate";

export type CodeReview = {
  verdict: "correct" | "incorrect" | "partial";
  passed_tests: number;
  total_tests: number;
  hint: string;
  rationale: string;
  time_complexity: string;
  space_complexity: string;
  confidence: "high" | "medium" | "low";
};

type GeminiReview = Partial<CodeReview> & { verdict?: string; confidence?: string };

const totalTests = 8;

export async function reviewCode(problemId: string, language: string, code: string): Promise<CodeReview> {
  const fallback = localReview(problemId, language, code);
  const apiKey = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_GEMINI_API_KEY?.trim();
  if (!apiKey) return fallback;

  try {
    const aiReview = await reviewWithGemini(apiKey, problemId, language, code);
    return normalizeReview(aiReview, fallback);
  } catch (error) {
    console.error("Gemini code review failed; using local reviewer.");
    return fallback;
  }
}

async function reviewWithGemini(apiKey: string, problemId: string, language: string, code: string): Promise<GeminiReview> {
  const problem = getProblem(problemId);
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  const prompt = `You are the code-review and test-evaluation assistant for a DSA practice platform.

Evaluate the submitted ${language} code against the problem below. Do not reward comments, function names, or code that only looks plausible. Trace the algorithm, check syntax-level intent, edge cases, mutation/return behavior, and expected time and space complexity. Treat a solution as correct only when it solves the stated problem for all normal and boundary inputs. Never reveal a complete replacement solution in the hint.

Problem: ${problem.title}
Description: ${problem.description}
Examples: ${problem.examples.join(" | ")}
Constraints: ${problem.constraints.join(" | ")}
Topics: ${problem.topics.join(", ")}

Submitted code:
---
${code.slice(0, 16000)}
---

Return only a JSON object with this exact shape:
{
  "verdict": "correct" | "incorrect" | "partial",
  "passed_tests": number,
  "total_tests": 8,
  "hint": "one concise Socratic hint that guides the next step without giving the answer",
  "rationale": "one or two concise sentences explaining the decision",
  "time_complexity": "one Big-O expression only, such as O(1), O(log n), O(n), O(n log n), O(n^2), or O(m + n)",
  "space_complexity": "one Big-O expression only, such as O(1) or O(n)",
  "confidence": "high" | "medium" | "low"
}`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) throw new Error(`Gemini returned HTTP ${response.status}.`);
  const body = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
  if (!text) throw new Error("Gemini returned an empty review.");
  return JSON.parse(text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "")) as GeminiReview;
}

function normalizeReview(value: GeminiReview, fallback: CodeReview): CodeReview {
  const verdict = value.verdict === "correct" || value.verdict === "incorrect" || value.verdict === "partial" ? value.verdict : fallback.verdict;
  const confidence = value.confidence === "high" || value.confidence === "medium" || value.confidence === "low" ? value.confidence : fallback.confidence;
  const passed = typeof value.passed_tests === "number" && Number.isFinite(value.passed_tests) ? Math.max(0, Math.min(totalTests, Math.round(value.passed_tests))) : verdict === "correct" ? totalTests : fallback.passed_tests;
  return {
    verdict,
    passed_tests: verdict === "correct" ? totalTests : passed,
    total_tests: totalTests,
    hint: typeof value.hint === "string" && value.hint.trim() ? value.hint.trim() : fallback.hint,
    rationale: typeof value.rationale === "string" && value.rationale.trim() ? value.rationale.trim() : fallback.rationale,
    time_complexity: normalizeBigO(value.time_complexity, fallback.time_complexity),
    space_complexity: normalizeBigO(value.space_complexity, fallback.space_complexity),
    confidence,
  };
}

function localReview(problemId: string, language: string, code: string): CodeReview {
  const problem = getProblem(problemId);
  const correct = isLikelyCorrect(problemId, code);
  const empty = code.trim().length < 30;
  const complexity = inferComplexity(problemId, code);
  const verdict = correct ? "correct" : empty ? "partial" : "incorrect";
  const hintByTopic: Record<string, string> = {
    "Linked List": "Which pointer represents the portion of the list you have already processed?",
    Stack: "What should be true about the most recently opened item when a closing bracket arrives?",
    "Binary Tree": "Which traversal structure lets you finish one level before moving to the next?",
    "Graph BFS": "How will you mark a visited node so you do not count or explore it twice?",
    "Binary Search": "After checking the midpoint, which half can no longer contain the target?",
    Sorting: "What smaller subproblem can you solve first, and how will you combine its result?",
  };
  const hint = correct ? "Your current approach matches the core requirement. Which edge case will you test next?" : hintByTopic[problem.topics[0]] ?? "What invariant should remain true after every step of your algorithm?";
  return {
    verdict,
    passed_tests: correct ? totalTests : 0,
    total_tests: totalTests,
    hint,
    rationale: correct ? `The ${language} attempt exposes a complete ${problem.title} approach for the local assistant to review.` : empty ? "The editor still contains a starter or incomplete attempt." : `The local assistant cannot yet verify the required ${problem.title} invariant in this attempt.`,
    time_complexity: complexity.time,
    space_complexity: complexity.space,
    confidence: correct ? "medium" : "low",
  };
}

function normalizeBigO(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const match = value.match(/O\s*\(\s*[^)]+\)/i);
  return match ? match[0].replace(/\s+/g, " ").replace(/\s*\)$/, ")") : fallback;
}

function inferComplexity(problemId: string, code: string) {
  const normalized = code.toLowerCase();
  const nestedLoops = /(for|while)[\s\S]{0,500}(for|while)/.test(normalized);
  const recursive = /\b(reverse|solve|search|sort|dfs|bfs)\s*\([^)]*\)[\s\S]{0,500}\b\1\s*\(/i.test(code);
  const allocates = /malloc|calloc|realloc|new\s|vector|list\s*\(|append\s*\(|push_back/.test(normalized);

  let time = "O(n)";
  if (nestedLoops) time = "O(n^2)";
  else if (problemId === "binary-search") time = "O(log n)";
  else if (problemId === "merge-sort") time = "O(n log n)";
  else if (problemId === "number-of-islands" && /(grid|neighbor|dfs|bfs)/.test(normalized)) time = "O(m * n)";
  else if (problemId === "binary-tree-level-order" && /(queue|deque|level)/.test(normalized)) time = "O(n)";
  else if (recursive && problemId === "merge-sort") time = "O(n log n)";

  let space = allocates || recursive ? "O(n)" : "O(1)";
  if (problemId === "valid-parentheses" && /(stack|push|append)/.test(normalized)) space = "O(n)";
  if (problemId === "binary-tree-level-order" || problemId === "number-of-islands") space = "O(n)";
  return { time, space };
}
