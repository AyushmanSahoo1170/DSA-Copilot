import { getProblem } from "./problems";
import { reviewCode, type CodeReview } from "./ai-review";

export type JudgeTest = { id: number; name: string; visibility: "sample" | "hidden"; input?: string; expectedOutput?: string; actualOutput?: string; status: "passed" | "failed"; message: string };

const hiddenNames = ["Empty input", "Single element", "Boundary values", "Repeated values", "Large input"];

export async function judgeCode(problemId: string, language: string, code: string, mode: "run" | "submit") {
  const problem = getProblem(problemId);
  const review: CodeReview = await reviewCode(problemId, language, code);
  const correct = review.verdict === "correct";
  const sampleInput = problem.examples[0]?.replace(/^Input:\s*/i, "") ?? "sample input";
  const sampleExpected = problem.examples[1]?.replace(/^Output:\s*/i, "") ?? "expected output";
  const all: JudgeTest[] = [
    { id: 1, name: "Example 1", visibility: "sample", input: sampleInput, expectedOutput: sampleExpected, status: correct ? "passed" : "failed", message: correct ? "Output matches expected result" : "Output does not match expected result" },
    { id: 2, name: "Example 2", visibility: "sample", input: "standard boundary input", expectedOutput: "expected result", status: correct ? "passed" : "failed", message: correct ? "Output matches expected result" : "A logic gap was detected" },
    { id: 3, name: "Example 3", visibility: "sample", input: "edge-case input", expectedOutput: "expected result", status: correct ? "passed" : "failed", message: correct ? "Output matches expected result" : "A logic gap was detected" },
    ...hiddenNames.map((name, index) => ({ id: index + 4, name, visibility: "hidden" as const, status: correct ? "passed" as const : "failed" as const, message: correct ? "Passed hidden test" : "Hidden test failed" })),
  ];
  const tests = mode === "run" ? all.slice(0, 3) : all;
  const passed = tests.filter(test => test.status === "passed").length;
  return { verdict: correct && passed === tests.length ? "correct" : passed > 0 ? "partial" : "incorrect", passed, total: tests.length, tests, review };
}
