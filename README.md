# DSA Copilot

DSA Copilot is an interactive learning platform for students who are learning data structures and algorithms but need more guidance than a static solution or a compiler error can provide.

The project was collaboratively developed by:

- **Ayushman Sahoo** — UPES, Dehradun
- **Omm Biswajit Kanungo** — SOA University
- With the assistance of **OpenAI Codex** and **GPT-5.6 Luna**

## Problem statement

Students often understand the theory of a data structure but struggle when they have to implement it. Common problems include:

- Off-by-one errors
- Incorrect loop boundaries
- Wrong recursion base cases
- Pointer and reference mistakes
- Incorrect BFS/DFS traversal order
- Losing track of time and space complexity
- Receiving a complete solution instead of learning how to discover it

Traditional online judges are excellent at deciding whether code passes, but they usually do not explain the mistake in a patient, educational way. AI assistants can explain code, but they may reveal the answer too quickly or fail to connect the feedback to the exact problem.

## Our solution

DSA Copilot combines a coding workspace with a Socratic learning assistant.

The student can:

1. Read a problem statement with examples and constraints.
2. Select C, Python, or Java.
3. Type or paste an attempt into the editor.
4. Receive live code-review feedback while editing.
5. Run visible sample tests.
6. Submit against sample and hidden test cases.
7. See individual test-case results and an overall verdict.
8. Receive a guiding question instead of a complete solution when the approach is incorrect.
9. Step through a data-structure visualization.
10. Track solved problems, submission history, accuracy, and topic mastery.

The MVP supports two review modes. With `GEMINI_API_KEY` configured, the server uses Gemini for live code review, judge-style verdicts, Socratic guidance, and Big-O complexity analysis. Without the key, a local fallback reviewer keeps the demo usable. Its judge-style flow is inspired by platforms such as LeetCode and HackerRank: visible tests are used for Run, all tests are used for Submit, and solved status is updated only after an accepted submission.

## Main features

### Problem library

The library contains problems covering linked lists, stacks, binary trees, graphs, binary search, and sorting. Problems can be filtered by:

- Topic
- Difficulty
- Solved or unsolved status
- Search text

Each problem has its own description, examples, constraints, starter code, and visualization type.

### VS Code-style editor

The workspace provides:

- Editable code area
- Automatic line numbering
- Tab indentation and Shift+Tab dedentation
- C, Python, and Java starter templates
- Reset-to-starter functionality
- Run and Submit actions

### General code-review assistant

The reviewer analyzes the current code against the selected problem and returns:

- `correct`, `partial`, or `incorrect` verdict
- Passed and total test counts
- A short rationale
- Complexity guidance
- One Socratic hint

When Gemini is configured, the review is generated server-side through the Google Gemini `generateContent` API. The API key is never placed in client code. Complexity analysis is derived from the reviewed attempt and returns explicit Big-O time and space expressions.

The reviewer avoids directly pasting a fixed solution. Instead, it asks questions such as what invariant should remain true, which pointer should advance, or which half of a search interval can be discarded.

### Judge-style test reporting

Run displays visible sample cases. Submit displays both visible and hidden case statuses, including:

- Passed/failed state
- Test-case name
- Expected-result messaging for visible cases
- Aggregate score
- Final verdict

### Visual learning

The visualization tab provides step controls, playback, and sliders for:

- Linked-list pointer movement
- Stack push/pop behavior
- Binary-tree traversal
- Graph BFS exploration
- Array and binary-search narrowing

### Progress tracking

Submissions are stored locally in the browser for the current MVP and are scoped by the signed-in account ID, with a separate guest scope. They are not synchronized across devices. The Progress page calculates:

- Overall mastery
- AI-reviewed accuracy
- First-try accuracy
- Solved problem count
- Topic-level scores
- Submission history

## How Codex contributed

OpenAI Codex was used as the implementation and engineering collaborator for the project. Its main contributions included:

- Converting the product specification into a working Next.js application
- Creating the project structure and reusable components
- Building the dashboard, problem library, workspace, progress page, and profile page
- Implementing the editable code editor and automatic line indexing
- Adding the local judge-style review flow
- Creating the problem catalog and problem-specific starter templates
- Implementing Socratic hint behavior and visualization controls
- Debugging Next.js dynamic route parameters and client-side state issues
- Fixing submission persistence and solved-status updates
- Running production builds and resolving TypeScript errors
- Iterating on the UI using the supplied Spline reference design

Codex was used as a hands-on coding agent: it inspected the repository, edited files, ran commands, diagnosed build errors, and verified the application after changes.

## How GPT-5.6 Luna contributed

GPT-5.6 Luna was used as the reasoning and product-design assistant during development. Its contribution focused on:

- Breaking the DSA learning problem into practical product features
- Designing the Socratic hint strategy
- Suggesting problem-specific feedback questions
- Reasoning about common algorithm mistakes and edge cases
- Designing the code-review response structure
- Planning the relationship between code attempts, test results, solved status, and progress metrics
- Helping refine the user experience around learning instead of simply displaying answers
- Reviewing implementation decisions and suggesting improvements to the learning flow

In short, GPT-5.6 Luna supported the thinking, teaching strategy, architecture decisions, and code-review behavior, while Codex applied those decisions to the repository and validated the implementation.

## Technology stack

### Current MVP

- **Next.js App Router**
- **React**
- **TypeScript**
- **CSS with a custom dark/light-gradient design system**
- **SVG and CSS visualizations**
- **Next.js Route Handlers** for local review and judge endpoints
- **Google Gemini API** through a server-side `GEMINI_API_KEY` environment variable
- **Browser localStorage** for submission history and solved status
- **Node.js and npm** for development and builds

### Planned production integrations

The original product plan also allows for these future integrations:

- Supabase Auth
- PostgreSQL
- Prisma ORM
- Judge0 for secure multi-language execution
- Monaco Editor
- OpenAI Responses API with structured outputs
- Framer Motion for richer animation
- Vercel for deployment

The current MVP intentionally does not execute arbitrary user code in the browser. Gemini reviews the submitted code semantically, while the local judge simulates the Run/Submit workflow. A production deployment should use a secure execution sandbox such as Judge0 instead of evaluating untrusted code directly on the application server.

## Run locally on any computer

### Requirements

- Node.js 20 LTS or newer
- npm
- Git, optional but recommended

Check the installed versions:

```bash
node --version
npm --version
```

### Installation

Clone or download the project, then open a terminal in the project folder:

```bash
cd dsa-copilot
npm install
```

Start the development server:

```bash
npm run dev
```

To enable Gemini review locally, copy `.env.example` to `.env.local` and set:

```env
GEMINI_API_KEY=your_google_ai_studio_key
GEMINI_MODEL=gemini-2.5-flash
```

Keep `.env.local` private. Do not use a `NEXT_PUBLIC_` prefix for the Gemini key.

Open the application at:

```text
http://localhost:3000
```

### Windows PowerShell

If PowerShell blocks `npm.ps1`, use the Windows command wrapper:

```powershell
npm.cmd install
npm.cmd run dev
```

### Production build

```bash
npm run build
npm run start
```

Then open `http://localhost:3000` again.

## Deploy to Vercel

This is a standard Next.js project and can be deployed directly to Vercel without a custom `vercel.json` file. Import the repository in Vercel, keep `npm run build` as the build command, add `GEMINI_API_KEY` and `GEMINI_MODEL` as server-side environment variables, then deploy. You can also use `vercel login`, `vercel`, and `vercel --prod` from the project root.

See [DEPLOY.md](DEPLOY.md) for the complete Vercel checklist, environment-variable guidance, and current MVP limitations.

## Project structure

```text
app/
  api/
    ai/                 Review and complexity routes
    execute/            Run and submit judge routes
  problems/             Problem library and coding workspace
  progress/             Submission-based progress dashboard
  practice/adaptive/    Adaptive practice recommendation
  page.tsx              Main dashboard
  globals.css           Application design system
components/
  shell.tsx             Application navigation shell
lib/
  problems.ts           Problem catalog and starter code
  evaluate.ts           Local semantic evaluator
  ai-review.ts          General assistant review contract
  judge.ts              Run/Submit test-case judge flow
  activity.ts           Account-scoped activity and streak calculations
  account-data.ts       Account-scoped browser persistence helpers
```

## 🛠️ Architecture & Production Roadmap

This project is built as an AI-first, lightweight educational prototype optimized for instant, zero-latency feedback without complex server overhead.

### Current Design Decisions
* **AI-First Semantic Evaluation:** Uses structured AI responses for instant logic and edge-case review, bypassing heavy execution container overhead.
* **Account-Scoped Client Persistence:** Utilizes account-scoped local storage for rapid prototyping and offline-first responsiveness; progress is not synchronized across devices.

### Future Production Scale
* **Auth & Persistence:** Email/password authentication works locally with a browser fallback, while Google, Apple, and GitHub OAuth are wired through Supabase when its public environment variables are configured. A hosted per-user database is still needed for cross-device progress.
* **Isolated Execution:** Sandboxed code execution (Docker / Judge0) for full multi-language runtime validation.
* **Rate Limiting & Security:** Server-side API key rotation, redis-backed rate limiting, and strict input sanitization.

## License

This project was created for educational and collaborative development purposes by Ayushman Sahoo and Omm Biswajit Kanungo.
