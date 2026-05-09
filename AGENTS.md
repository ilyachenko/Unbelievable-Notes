# Repository Guidelines

## Project Structure & Module Organization
This repository is a small Vite + React + TypeScript app. Application code lives in `src/`, with the main entry in `src/main.tsx` and the note editor in `src/NotesApp.tsx`. Shared styles are kept alongside components in `src/*.css`. Static files that should be served as-is belong in `public/` (for example `public/notes.svg`). Build output is generated into `dist/`; treat it as disposable and do not edit it manually.

## Build, Test, and Development Commands
Use `npm install` to restore dependencies. The main local workflows are:

- `npm run dev` starts the Vite dev server with hot reload.
- `npm run build` runs TypeScript compilation (`tsc -b`) and produces a production bundle in `dist/`.
- `npm run preview` serves the production build locally for a final check.
- `npm run lint` runs ESLint across the repository.
- `npm run deploy` publishes `dist/` to GitHub Pages; `npm run predeploy` builds first.

## Coding Style & Naming Conventions
Write React components and hooks in TypeScript (`.tsx`). Use PascalCase for components (`NotesApp.tsx`) and camelCase for hooks and helpers (`useQueryParam.tsx`). Keep files focused and colocate component-specific CSS with the component. ESLint is configured in `eslint.config.js` with `typescript-eslint`, `react-hooks`, and `react-refresh`; run lint before opening a PR. The current codebase is not fully style-normalized, but new changes should prefer consistent formatting within the touched file.

## Testing Guidelines
There is no automated test suite configured yet. Until one is added, treat `npm run lint`, `npm run build`, and a manual browser check via `npm run dev` or `npm run preview` as the minimum validation for every change. If you add tests later, place them next to the feature or under a dedicated `src/__tests__/` directory and name them `*.test.ts(x)`.

## Commit & Pull Request Guidelines
Recent commits use short, imperative subjects such as `fix favicon for gh pages` and `Update page title to "Unbelievable Notes"`. Follow that pattern: one concise summary per commit, focused on the user-visible change. Pull requests should include a brief description, validation steps, and screenshots or a short video for UI changes. Link the relevant issue when applicable.

## Deployment Notes
The app is configured for GitHub Pages through the `homepage` field in `package.json`. If you change routing, asset paths, or the base URL behavior, verify the production build on the GitHub Pages path before merging.
