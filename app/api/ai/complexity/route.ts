import { NextResponse } from "next/server";
import { reviewCode } from "../../../../lib/ai-review";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code : "";
  const language = typeof body.language === "string" ? body.language : "c";
  const problemId = typeof body.problemId === "string" ? body.problemId : "";
  const review = await reviewCode(problemId, language, code);

  return NextResponse.json({
    time_complexity: review.time_complexity,
    space_complexity: review.space_complexity,
    reasoning: review.rationale,
    confidence: review.confidence,
    verdict: review.verdict,
  });
}
