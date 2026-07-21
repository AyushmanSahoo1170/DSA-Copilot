import { NextResponse } from "next/server";
import { judgeCode } from "../../../../lib/judge";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code : "";
  const problemId = typeof body.problemId === "string" ? body.problemId : "";
  const language = typeof body.language === "string" ? body.language : "c";
  const result = await judgeCode(problemId, language, code, "run");
  return NextResponse.json({ status: result.verdict === "correct" ? "accepted" : "failed", verdict: result.verdict, hint: result.review.hint, tests: result.tests, passed: result.passed, total: result.total, runtime: "Assistant review · 0.02s" });
}
