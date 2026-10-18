# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

AudiNest, an Android audiobook player (`com.lokdevp.audinest`, not yet on Google Play). Expo SDK 58 (React Native 0.88, React 19), TypeScript, Expo Router. It must keep running in **Expo Go**, so use only modules bundled with Expo Go plus pure-JS packages. Anything else needs a dev build. There is no committed `android/`/`ios/`: native projects are generated (CNG), so configure native behaviour in `app.json` / config plugins.

## Commands

- `pnpm start`: Metro / Expo dev server (Expo Go)
- `npx expo run:android`: local dev build
- `pnpm test`: Jest with `jest-expo`. Run one file with `pnpm jest __tests__/position.test.ts`, or one test with `-t "name"`
- `pnpm typecheck`, `pnpm lint` (`expo lint`, flat config in `eslint.config.js`)
- `npx expo install <pkg>`: add dependencies (picks SDK-compatible versions). `npx expo-doctor` checks the setup.

pnpm with `nodeLinker: hoisted` (`pnpm-workspace.yaml`). `pnpm-lock.yaml` is the lockfile.

## Architecture

- **Routes (`src/app/`)**: `_layout.tsx` is a Stack that waits for store hydration. `index.tsx` is the library, `player.tsx` the player, `menu.tsx` folder selection/rescan plus About.
- **Stores (`src/store/`, zustand)**:
  - `useLibrary` (persisted as a JSON file via `fileStorage`): `libraryUri` and `books` keyed by id.
  - `useProgress` (persisted to AsyncStorage): per-book `positions`, `selectedId`, `speed`.
  - `usePlayerState` (not persisted): `playing` and scan progress.
  - The library and progress are kept apart so the once-per-second position writes stay small.
- **Chapter model (`src/types.ts`)**: every book is a flat `chapters` list. Each chapter has `uri` (its file), `startTime` (offset inside that file), `duration` and `totalProgressTime` (offset in the book). Single-file M4B books have many chapters with one `uri`. Folder books have one or more chapters per file. A `Position` is `{ chapterIdx, currentTime (inside the chapter), totalProgressTime }`.
- **`src/lib/position.ts`**: pure conversions between positions and the player's file time. `positionFromFileTime` moves across chapters of the same file. Unit-tested. Keep playback logic here when possible.
- **`src/audio/playback.ts`**: the single `expo-audio` player, with module-level state (`loadedUri`, `activeBookId`, `seekTarget`). Status updates (every 1s) are converted into positions. When a file ends it moves to the next file's chapter. Screens call its exported functions (`play`, `skip`, `goToChapter`, `selectBook`, …) directly.
- **Scanning (`src/lib/scan.ts`)**: the library is a SAF `content://` directory from `Directory.pickDirectoryAsync()`. Each child becomes one book. Files are read one at a time. Covers are written to `Paths.document/covers`. A rescan keeps positions of books that still exist (`reconcilePositions`). `classifyEntries` / `assembleAudiobook` are pure and tested.
- **Metadata (`src/lib/metadata.ts`)**: `music-metadata` over `FileHandleTokenizer` (`src/lib/fileTokenizer.ts`), which reads byte ranges through an expo-file-system `FileHandle`, so large M4Bs are never loaded whole. Don't use `parseBlob`: expo's `File.slice` reads the entire file. Missing durations fall back to `src/audio/probe.ts`.

## Bundling gotchas

- `file-type` (a music-metadata dependency) has a non-literal `import()` that Hermes can't compile. It is aliased to `src/shims/file-type.ts` in both `metro.config.js` and `jest.config.js`. Keep passing `fileInfo.path` to the tokenizer so music-metadata picks parsers by extension.
- `babel.config.js` adds `@babel/plugin-transform-unicode-sets-regex` (Hermes rejects `/…/v`) and, for tests only, `@babel/plugin-transform-dynamic-import`.
- `jest.config.js` maps `music-metadata` to `lib/core.js` (its exports only have `import` conditions) and transforms its ESM dependencies.
- Production builds strip `console.*` (`transform-remove-console`).
- `tsconfig.json` sets `types: ["jest", "node"]`, because TypeScript 6 no longer includes all `@types` by default.

## Testing

Tests are in `__tests__/`. Helpers and audio fixtures (`book.m4b` with three chapters, `track.mp3` with a cover, both made with ffmpeg) are in `test-utils/`. Native Expo modules are mocked with `jest.mock` in each test file.
