# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GitHub Action that deletes images from GitHub Container Registry (GHCR) by tag, untagged cleanup, or tag regex matching. Runs as a Node.js 20 action using `@actions/core` and `@actions/github` (Octokit).

## Commands

- **Build (bundle for distribution):** `npm run prepare` — uses `@vercel/ncc` to bundle `index.js` into `dist/`
- **Lint:** `npm run lint`
- **Test:** `npm test` (Jest). Integration tests require `INTEGRATION_TEST_TOKEN` env var with a GitHub PAT.
- **All checks:** `npm run all` (lint + prepare + test)
- **Release:** `npm run release` (uses release-it, tags as `v${version}`)

**Important:** After changing source files, run `npm run prepare` and commit the updated `dist/` directory. CI checks that `dist/` is in sync with source.

## Architecture

Three source files, no build-time transpilation (CommonJS):

- **`index.js`** — Entry point. Reads config, creates Octokit client, dispatches to the appropriate action based on which mutually exclusive option is set (`tag`, `untaggedKeepLatest`, or `taggedKeepLatest` + `tagRegex`).
- **`utils.js`** — Config parsing (`getConfig`) and GitHub API helpers: paginated package version iteration, find-by-tag, find-untagged, find-by-regex, and delete. All API calls target org-owned packages via `octokit.rest.packages`.
- **`actions.js`** — High-level action functions that compose utils: `deleteByTag`, `deleteUntaggedOrderGreaterThan`, `deleteTagRegexMatchOrderGreaterThan`.

Action inputs are defined in `action.yml`. The selectors (`tag`, `untagged-keep-latest`, `untagged-older-than`, `tagged-keep-latest`/`tag-regex`) are mutually exclusive.

## Testing

- `utils.test.js` — Unit tests for `getConfig` (env-based, no mocks needed) and integration tests for API functions (require real GitHub token).
- CI workflow (`.github/workflows/ci.yml`) also does an end-to-end test: pushes dummy images to GHCR then runs the action against them.
