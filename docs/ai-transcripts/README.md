# AI-assisted development process

The assignment requires the complete AI coding transcript or session export for every
AI tool used on this project, because a one-shot AI-generated submission is not
acceptable on its own. This file documents *how* three different AI tools were used;
the actual, unedited transcripts belong next to it as separate files (see below).

## Tools used and their roles

### Kilo Code — primary implementation

Used for the bulk of hands-on coding under direct instruction: project scaffolding,
backend structure (models, repositories, services, routes), initial frontend setup,
and applying specific corrections when a review turned up a problem.

### Cline — testing and review

Used to inspect the project separately from the tool that wrote it: running the app,
looking for bugs, incorrect behavior, and gaps against the requirements, and reporting
findings back for a human decision on whether and how to act on them.

### Claude Code — research, review, and direct implementation

Claude's role was broader than research alone and changed over the course of the
project. It included:

- Reviewing backend and frontend code against the assignment PDF requirement-by-requirement
- Investigating and root-causing bugs found during review or live testing
- Writing fix instructions for Kilo Code to execute, then re-reviewing the result
- Directly authoring/rewriting substantial parts of the codebase itself, including:
  the frontend application shell, ticket detail/list/create-ticket screens, shared UI
  components, the real-PostgreSQL test fixtures, seed data, the Docker setup
  (`Dockerfile`s + `docker-compose.yml`, built and run locally to verify it actually
  works end to end), and this documentation
- Managing git history and the GitHub push for submission

In other words: Claude was not only a research/reasoning assistant on this project —
a significant share of the final code was written directly by Claude under human
direction, review and correction, the same as Kilo Code's role. The actual
`claude-code-session.md` transcript is the accurate record of which parts.

## My role (the author)

Across all three tools, I owned: understanding the assignment and deciding the
implementation direction, giving each tool its instructions, reviewing what came back
against the requirements and the running application (not just reading the diff),
deciding which AI suggestions were correct or appropriate, catching and correcting AI
mistakes, and final integration and submission.

## Development flow

Requirements → research/investigation → architecture decisions → implementation
(Kilo Code and/or Claude Code, depending on the task) → my review → live testing →
Cline review pass → gaps found → root-cause investigation → corrective instruction →
re-implementation → retest → final review → submission.

This iterative loop — not a single prompt producing the whole project — is what the
transcripts below are evidence of.

## What belongs in this folder

The real session exports from each tool, as their own files:

```
docs/ai-transcripts/
├── README.md                  (this file)
├── claude-code-session.md
├── kilo-code-session.md
└── cline-session.md
```

**Nothing in the three transcript files is written, edited or summarised by an AI tool
on the author's behalf.** A transcript is only meaningful as evidence if it is the
real, unedited record of what was asked and what the tool did — editing or generating
it here would defeat the whole point of requiring one. This README is the only file in
this folder an AI tool has written; every transcript next to it must be a direct,
unedited export added by the author.
