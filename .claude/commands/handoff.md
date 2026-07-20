---
description: Orient on Agent Lima — read the handoff + status and summarise state and next steps
---

You are picking up the Agent Lima project. Do the following, then stop and wait:

1. Read `HANDOFF.md` (deploy/infra/access/gotchas/pending), `BUILD_PROGRESS.md` (feature status), and
   `docs/RUNBOOK.md` (how to run/test).
2. Check working state: `git status` and `git log --oneline -5`.
3. Give a tight briefing:
   - What Agent Lima is (one line).
   - Current deploy state (Coolify on Hetzner `167.233.211.252`, domain `agentlima.com`) and whether the
     app is currently reachable (only check via SSH `ssh -i ~/.ssh/lima_hetzner root@167.233.211.252` if asked).
   - The top 3 pending items from HANDOFF.md's checklist.
4. Ask what to work on. Do not start changes until told.

Constraints: commit as Shoji <shujaat@nexusedu.co.uk>; verify with `pnpm typecheck && pnpm test && pnpm build`
before pushing; never paste secrets/tokens into chat.
