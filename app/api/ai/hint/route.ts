import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code : "";
  const language = typeof body.language === "string" ? body.language : "c";
  const problemId = typeof body.problemId === "string" ? body.problemId : "";
  const hintThread = Array.isArray(body.hintThread) ? body.hintThread : [];
  const turn = Math.floor(hintThread.length / 2);
  const hints: Record<string, string[]> = {
    "reverse-linked-list": ["Which pointer represents the portion of the list you have already reversed?", "Before changing current's next link, what value must you save so the unvisited list is not lost?", "After one link is reversed, which two pointers need to advance together?", "When the loop stops, which pointer is now the head of the reversed list?"],
    "valid-parentheses": ["What data structure remembers the most recently opened bracket?", "When a closing bracket arrives, what should you compare it with?", "What should happen if the stack is empty before a closing bracket is matched?", "What condition tells you every opening bracket was closed correctly?"],
    "binary-search": ["How can you inspect the middle element without scanning every item?", "If the midpoint is smaller than the target, which boundary should move?", "What condition means the search interval is empty?", "Which midpoint index should you return when the values match?"],
    "binary-tree-level-order": ["Which FIFO data structure visits a tree level before the next one?", "How can the number of items in the queue mark the end of one level?", "When you remove a node, which children should enter the next frontier?", "What should the traversal return for an empty root?"],
    "number-of-islands": ["What should happen when you find an unvisited land cell?", "How will you explore its horizontal and vertical neighbors?", "How will you mark a cell so the same island is not counted again?", "When should the island count increase?"],
    "merge-sort": ["What smaller subproblems can you create by splitting the array in half?", "What base case means a section is already sorted?", "When two sorted halves meet, which front element should be copied next?", "Where should the merged values be written back?"],
  };
  let hint = (hints[problemId] ?? ["What is the smallest state change your algorithm must make first?", "Which invariant should remain true after each iteration?", "What edge case would expose the current gap?", "How can you verify that the returned value represents the whole answer?"])[Math.min(turn, (hints[problemId] ?? []).length - 1)];
  if (!hint) hint = "What edge case would expose the current gap?";
  return NextResponse.json({ verdict: "partial", mistake_category: null, hint, referenced_line: null });
}
