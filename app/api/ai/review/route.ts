import { NextResponse } from "next/server";
import { reviewCode } from "../../../../lib/ai-review";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code : "";
  const problemId = typeof body.problemId === "string" ? body.problemId : "";
  const language = typeof body.language === "string" ? body.language : "c";
  const review = await reviewCode(problemId, language, code);
  return NextResponse.json(review);
}
