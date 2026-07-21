export function isLikelyCorrect(problemId: string, code: string) {
  const normalized = code.toLowerCase();
  if (!code.trim() || /todo|your code|pass\s*$/.test(normalized) || /return\s+(head|false|-1|0)\s*;?\s*$/.test(normalized)) return false;
  switch (problemId) {
    case "reverse-linked-list":
      return (/return\s+\w+\s*;?\s*$/.test(normalized) && /(while|for)/.test(normalized) && /(\.next|->next)/.test(normalized) && /(prev|previous|prior)\s*=/.test(normalized) && /(next|nxt)\s*=/.test(normalized)) || (/reverse\s*\(/.test(normalized) && /(next\.next|next->next)/.test(normalized) && /return\s+\w+/.test(normalized));
    case "valid-parentheses":
      return /(stack|push|append)/.test(normalized) && /(pop|pop\s*\()/.test(normalized) && /return\s+/.test(normalized) && /(for|while)/.test(normalized);
    case "binary-tree-level-order":
      return /(queue|deque)/.test(normalized) && /(left|right|children|level)/.test(normalized) && /return\s+/.test(normalized) && /(while|for)/.test(normalized);
    case "number-of-islands":
      return /(dfs|bfs|queue|stack|visited|seen)/.test(normalized) && /(grid|island|neighbor)/.test(normalized) && /return\s+/.test(normalized) && /(for|while|if)/.test(normalized);
    case "binary-search":
      return /(while|for)/.test(normalized) && /(mid|middle)/.test(normalized) && /(left|right|low|high)/.test(normalized) && /return\s+/.test(normalized);
    case "merge-sort":
      return /(merge|mergesort|merge_sort)/.test(normalized) && /(left|right|mid|middle)/.test(normalized) && /(return|void)/.test(normalized) && /(for|while|if)/.test(normalized);
    default:
      return /return/.test(normalized) && !/todo/.test(normalized);
  }
}
