---
name: branch-first
description: Enforce a "Branch First" workflow for all code modifications. Use this skill when receiving a Directive to implement a feature, fix a bug, or refactor code, to ensure changes are made in a dedicated branch rather than 'main'.
---

# Branch First Workflow

This skill ensures that all significant code modifications are performed in a dedicated feature, bugfix, or refactor branch.

## Core Mandate

**NEVER** start implementing a Directive directly on `main`. Always create a new branch first.

## Workflow

1. **Check Current Branch:** Run `git branch` to see where you are.
2. **Identify Task Type:**
   - New Feature -> `feature/`
   - Bug Fix -> `bugfix/`
   - Refactoring -> `refactor/`
   - UI/UX Update -> `ui-ux/`
3. **Generate Branch Name:** Use a descriptive, hyphen-separated name (e.g., `feature/mahjong-tutor`).
4. **Create and Switch:** Run `git checkout -b <branch-name>`.
5. **Verify:** Run `git branch` to confirm you are on the new branch.

## Commit Strategy

Once on the branch:
- Stage and commit your changes with descriptive messages.
- After completion, propose pushing the branch and creating a pull request.
