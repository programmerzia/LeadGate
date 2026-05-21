---
name: find-skills
description: Helps users discover and install agent skills when they ask questions like "how do I do X", "find a skill for X", "is there a skill that can...", or express interest in extending capabilities. This skill should be used when the user is looking for functionality that might exist as an installable skill.
source: https://github.com/vercel-labs/skills/blob/main/skills/find-skills/SKILL.md
license: see upstream repo
vendored_at: lead-gate scaffold
---

# Find Skills

> Vendored from `vercel-labs/skills` so it travels with the repo and is auditable in our git history.
> Update procedure: re-fetch the upstream `SKILL.md`, diff, commit.

This skill helps you discover and install skills from the open agent skills ecosystem.

## When to Use This Skill

Use this skill when the user:

- Asks "how do I do X" where X might be a common task with an existing skill
- Says "find a skill for X" or "is there a skill for X"
- Asks "can you do X" where X is a specialized capability
- Expresses interest in extending agent capabilities
- Wants to search for tools, templates, or workflows
- Mentions they wish they had help with a specific domain (design, testing, deployment, etc.)

## What is the Skills CLI?

The Skills CLI (`npx skills`) is the package manager for the open agent skills ecosystem. Skills are modular packages that extend agent capabilities with specialized knowledge, workflows, and tools.

**Key commands:**

- `npx skills find [query]` — Search for skills interactively or by keyword
- `npx skills add <package>` — Install a skill from GitHub or other sources
- `npx skills check` — Check for skill updates
- `npx skills update` — Update all installed skills

**Browse skills at:** https://skills.sh/

## How to Help Users Find Skills

### Step 1: Understand What They Need

When a user asks for help with something, identify:

1. The domain (e.g., React, testing, design, deployment)
2. The specific task (e.g., writing tests, creating animations, reviewing PRs)
3. Whether this is a common enough task that a skill likely exists

### Step 2: Check the Leaderboard First

Before running a CLI search, check the [skills.sh leaderboard](https://skills.sh/) to see if a well-known skill already exists. The leaderboard ranks skills by total installs, surfacing the most popular and battle-tested options.

Top skills for web development include:

- `vercel-labs/agent-skills` — React, Next.js, web design (100K+ installs each)
- `anthropics/skills` — Frontend design, document processing (100K+ installs)

### Step 3: Search

```bash
npx skills find [query]
```

Examples:

- "how do I make my React app faster?" → `npx skills find react performance`
- "can you help me with PR reviews?" → `npx skills find pr review`
- "I need to create a changelog" → `npx skills find changelog`

### Step 4: Verify Quality Before Recommending

**Do not recommend a skill based solely on search results.** Always verify:

1. **Install count** — Prefer 1K+. Be cautious below 100.
2. **Source reputation** — Official orgs (`vercel-labs`, `anthropics`, `microsoft`, `supabase`) are more trustworthy.
3. **GitHub stars** — A skill from a repo with <100 stars warrants skepticism.
4. **Read the SKILL.md and any `scripts/`** before installing — they execute with your shell permissions.

### Step 5: Present Options

Show the user:

1. The skill name and what it does
2. The install count and source
3. The install command
4. A link to skills.sh

### Step 6: Install (only after the user confirms)

```bash
npx skills add <owner/repo@skill> -g -y
```

## Common Categories

| Category | Example queries |
|---|---|
| Web Development | react, nextjs, typescript, css, tailwind |
| Testing | testing, jest, playwright, e2e |
| DevOps | deploy, docker, kubernetes, ci-cd |
| Documentation | docs, readme, changelog, api-docs |
| Code Quality | review, lint, refactor, best-practices |
| Design | ui, ux, design-system, accessibility |

## When No Skills Are Found

1. Acknowledge that no existing skill was found
2. Offer to help directly using general capabilities
3. Suggest the user could create their own with `npx skills init`
