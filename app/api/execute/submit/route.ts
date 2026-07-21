import { NextResponse } from "next/server";
import { judgeCode } from "../../../../lib/judge";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code : "";
  const problemId = typeof body.problemId === "string" ? body.problemId : "";
  const language = typeof body.language === "string" ? body.language : "c";
  const result = await judgeCode(problemId, language, code, "submit");
  return NextResponse.json({ verdict: result.verdict, passed: result.passed, total: result.total, tests: result.tests, hint: result.review.hint, rationale: result.review.rationale, time_complexity: result.review.time_complexity, space_complexity: result.review.space_complexity, runtime: "Assistant review · 0.04s" });
}
