# How we used Kiro to build Na(h)

Na(h) ("say nah to hidden sodium") is a sodium tracker for home cooks managing
high blood pressure. You cook on camera, upload the clip, and the app shows an
interactive cooking journey: every seasoning added, when, how much, its sodium,
and the dish total against the 2,300 mg daily limit.

This document is an honest account of how Kiro was used to build it. Where a
Kiro feature was central to our workflow, we explain exactly how. Where a
feature was not used, we say so and describe how we would apply it with more
time, rather than claiming a box we did not tick. We think an accurate picture
of *how* we worked is more useful to judges than a checklist.

---

## 1. Project and team shape

The project is split into three modules with clean data contracts between them:

- **Module A — ingredient detection** (computer vision): video to frames to a
  vision-language model to `events.json` plus evidence images. Owned by a
  teammate (Jace).
- **Module B — sodium engine**: events to sodium per event and a dish total.
- **Module C — web application** (the frontend) and the FastAPI backend that
  joins A and B and serves the UI. This is the part this write-up focuses on,
  built with Kiro in the IDE.

Because modules were owned by different people, the *contract between them* —
not any single file — was the thing that had to stay stable. That shaped how we
used Kiro: we invested heavily in steering and written specs so the agent
always honoured the contract, and we used Kiro's verification discipline to make
sure a frontend change never silently broke the backend or the shared data
shape.

---

## 2. Which Kiro surfaces we used, and how they differed

**Kiro IDE (primary surface).** Essentially all of Module C and the backend
integration work was done through the Kiro agent inside the IDE. This mattered
for three reasons:

- **Workspace awareness.** The agent could read the real files, the real
  `package.json`, the real `tsconfig.json`, and the git state, instead of
  guessing. When we asked it to "build the hero," it first read the existing
  `Button` component, the design tokens in `globals.css`, the layout fonts, and
  the asset JSON shapes — then wrote code that matched what was actually there.
- **Multi-root workspace.** We had two folders open at once: the app repo and a
  separate `nah-export/` folder containing the approved hero prototype and its
  media. The agent read the handoff and prototype from one folder and
  implemented into the other, copying the ten media assets across and wiring
  them up.
- **Run and verify in place.** The agent ran `npm run build`, `npm run lint`,
  the Node test script, and `pytest` directly, read the output, and fixed what
  broke before telling us it was done. That tight read-edit-run loop is the
  single biggest reason the work held together.

**How we wrote prompts and worked together as a team.** The team used two
different kinds of AI help in sequence, and they complemented each other:

- A teammate used **Kiro and Claude** to author the written handoff documents —
  `KIRO_HANDOFF.md` (the product and API spec) and `HERO_HANDOFF.md` (the
  landing-page implementation spec). These were produced as detailed,
  self-contained specs with data schemas, token tables, component lists,
  timing, accessibility rules and an acceptance checklist.
- We then fed those documents to the **Kiro IDE agent** as the source of truth
  and had it implement against them. So one tool-chain produced the
  specification, and Kiro-in-the-IDE executed it. This division — "spec in one
  place, implementation in another, with the spec winning every conflict" — is
  how we split work across people and tools without stepping on each other.

Our prompting style with the IDE agent was deliberately spec-anchored: prompts
like "Read HERO_HANDOFF.md and the prototype; build the hero in this order;
follow the null-sodium rule; run build and lint when done." We leaned on the
agent to read first and plan, not to improvise.

We did **not** use the Kiro CLI, Kiro Web, or Crew for this project. With more
time, the CLI would have been the natural way to wire the test and build steps
into CI, and Crew would have let us run the Module A, B and C work streams as
parallel agents against the shared contract.

---

## 3. Spec-driven development (and how it compared to vibe coding)

We did not use Kiro's formal Spec feature (the native
`requirements.md -> design.md -> tasks.md` flow under `.kiro/specs/`). What we
did instead was a **document-driven** variant that achieved the same ends:

- **The spec was explicit and external.** `HERO_HANDOFF.md` defined, before any
  code: the exact file tree to create, the design tokens to reuse, every
  component and its props, the per-frame animation logic, the data schema for
  the tracking JSON, the routing behaviour, the accessibility rules, and a
  numbered acceptance checklist (§13). `KIRO_HANDOFF.md` defined the API
  contract and the product's hard rules.
- **The spec named a source of truth and a conflict order.** The handoff said,
  in writing, "the handoff wins over the prototype, which wins over the older
  spec." That single rule removed almost all ambiguity. When the prototype and
  the handoff disagreed (for example, the prototype split "hidden sodium."
  across a line; the handoff fixed it with flex-wrap chunks), the agent knew
  which to follow without asking.
- **Build order was part of the spec.** The handoff prescribed the order:
  assets and fonts, then the pure data/logic module, then the animated panel,
  then the stage, then the nav and headline, then the transition, then the
  below-the-fold sections, then the accessibility pass. We followed it, checking
  each step before moving on.

**How this improved the process.** Because the behaviour, the data shapes and
the acceptance criteria were written down first, the agent's output was
checkable against something concrete rather than against taste. We could ask
"does the chip count 2,080 to 2,930 to 3,890 and turn chilli past 2,300?" and
get a yes/no, not an opinion. It also made the work resumable: anyone (or the
agent after a context reset) could re-read the spec and know exactly where
things stood.

**Compared to vibe coding.** We used vibe-style, conversational prompting for
small, local changes — "remove the zoom, just fade between pages," or
investigating the git state. That was fast and fine for reversible,
well-contained edits. But for the hero — fourteen new files, shared refs, a
per-frame animation loop, strict design tokens — vibe coding would have drifted.
The spec kept a large, multi-file feature coherent and let us verify it against
named criteria. Our takeaway: vibe for the small and reversible, spec/document
discipline for anything with a contract, shared state, or more than a couple of
files.

A concrete example of the spec protecting us: the product rule "never show
`sodium_mg: null` as 0, and never hide flagged rows" lived in both the steering
and the handoff. When building the overlays and the results view, the agent
consistently rendered null sodium as "Not counted" and kept flagged rows
visible, because the rule was written where it could not be missed.

---

## 4. Steering docs — the single biggest lever

Steering was the most effective Kiro feature we used. Three always-included
steering files live in `.kiro/steering/`:

- **`product.md`** — what Na(h) is, the user flow, and the non-negotiables
  (hackathon demo, estimates not medical advice, English UI with British
  spelling).
- **`tech.md`** — the stack (Next.js App Router, TypeScript, Tailwind,
  shadcn/ui, Recharts) and the **hard rules**: don't edit Module A's `src/`,
  `tests/`, `examples/`; don't change backend response shapes without updating
  the handoff and keeping `pytest` green; never show null sodium as 0; never
  hide flagged rows; seek by `timestamp`, not `timestamp_start`; only
  `POST /api/sessions` receives video; no new dependencies without asking.
- **`api-contract.md`** — a compact mirror of the API and the `TimelineRow` /
  `Results` TypeScript shapes, plus the known demo totals.

Each file uses `inclusion: always`, so these rules were present in every single
turn without us re-pasting them. The strategy that made the biggest difference
was **encoding the irreversible mistakes as steering rules**. The rules that
protect the product's integrity (null handling, flagged rows, the `timestamp`
field, "only this endpoint takes video," "no new dependencies") are exactly the
things that are easy to get subtly wrong and expensive to catch later. Having
them in always-on steering meant the agent self-enforced them:

- It refused to add a dependency without asking.
- It used `size="sm"` on the existing `Button` and the existing colour tokens
  instead of inventing new ones, because steering said so.
- When asked to change copy in a way that would have contradicted the real
  backend behaviour (telling cooks unmeasured pours are counted, when the
  pipeline drops them), the agent pushed back and refused to make the UI lie
  about sodium — directly because the steering rules framed honesty about
  uncounted sodium as a hard constraint.

Steering also referenced the full spec via a file link
(`#[[file:KIRO_HANDOFF.md]]`), so the short always-on rules could pull in the
long contract on demand.

---

## 5. Verification discipline

Even without the formal testing features, verification was built into every
change, and Kiro drove it:

- After the hero work, the agent ran `npm run build` and fixed two real
  TypeScript errors it surfaced (a circular type between the events data and its
  types, and a JSON tuple-vs-array mismatch) before declaring success.
- It wrote a small Node check (`web/features/hero/sodiumTimeline.test.mjs`) that
  asserts the handoff's required invariants: `DISH_TOTAL === 3890`,
  `DISH_PCT === 169`, and the `totalAt` / `activeAt` step behaviour against the
  real tracking fixture. These are example-based assertions, not property-based
  tests, but they pinned the exact numbers the demo depends on.
- For the merge into `main`, it ran both the frontend build and the backend
  `pytest` suite, and correctly diagnosed that the only two failing backend
  tests fail purely because gitignored sample videos are absent from this
  machine, not because of the merge.

The habit — change, build, test, read the output, fix, then report — came from
Kiro's default workflow and caught issues the same turn they appeared.

---

## 6. Features we did not use (honest section)

We want to be straight with the judges about what we did not use, because a few
of these would genuinely have helped and we understand how.

**Agent hooks — not used.** There are no files in `.kiro/hooks/`. This is the
clearest missed opportunity. Given the rules we care about, the hooks we would
add are:

- A `PostFileSave` hook on `web/**/*.{ts,tsx}` to run `npm run lint`
  automatically.
- A `PreToolUse` hook that warns before any write under `src/`, `tests/` or
  `examples/` (Module A's protected area), turning a steering rule into an
  enforced guardrail.
- A `PostTaskExec` hook to run `pytest` in `backend/` after backend-touching
  work, so the "keep pytest green" rule is checked automatically.
- A `PreToolUse` hook on git push to block a direct push to `main` unless
  explicitly intended.

The idea of "different bots doing different work, split up" maps exactly onto
hooks plus (with more time) Crew: one automation lints on save, another guards
the protected module, another runs the backend tests, and separate agents own
the A/B/C work streams against the shared contract.

**MCP — not used.** No `mcp.json` exists in the workspace. The most useful MCP
servers for this project would have been a GitHub server (so the agent could
open the PR, read Jace's `CVmodel` branch, and compare Module A output without
leaving the IDE) and a filesystem/docs server for the design-system reference.
These would have made the cross-module handoff and the merge smoother; we did
the equivalent manually with git commands.

**Property-based testing — not used.** Our checks are example-based. We searched
the repo and found no Hypothesis or fast-check usage. PBT would have been a
strong fit for two specific requirements, and this is where we would apply it
next:

- The **sodium engine**: for any pantry and any sequence of events, the dish
  total must equal the sum of the counted events, a `null` quantity must never
  contribute 0 silently (it must mark the estimate incomplete), and the
  cumulative total must be monotonically non-decreasing. These are universal
  properties, not single examples — ideal for generated inputs.
- The **hero timeline logic**: `totalAt(t)` must be non-decreasing in `t` and
  must converge to `DISH_TOTAL`; `activeAt` must never return a box outside the
  panel. Properties like these catch edge cases (empty timelines, out-of-order
  events, times past the end) that example tests miss.

**Kiro Powers — not used.** No powers were installed. A frontend/design power
bundling accessibility and component best practices would have complemented the
hand-written design system; we encoded that expertise manually in steering and
the handoff instead.

---

## 7. What actually made the difference

If a judge takes one thing from this: the combination of **always-on steering
rules** and a **written spec with a declared source of truth** is what let a
single agent build a large, animated, contract-bound feature without drifting or
breaking the shared data shape. Steering kept the irreversible mistakes from
happening; the spec made every result checkable; and Kiro's read-first,
build-and-verify loop in the IDE closed the gap between "looks done" and "is
done." The features we skipped — hooks, MCP, PBT, Powers — are exactly the ones
we would reach for next to automate and harden the workflow we proved out by
hand.
