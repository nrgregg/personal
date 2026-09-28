# Personal research website

A static personal website for Nellie Gregg, with Home, Research Blog, Projects, Further Reading, and Archive views. Content currently uses placeholders. Comments and annotations are not implemented.

## Preview and edit

Content is generated from the Markdown notes in the parent Obsidian vault. See `../Writing Guide.md` for properties, formatting, images, and templates. Do not edit `index.html` directly.

Double-click `../Start Preview.cmd` and visit http://127.0.0.1:4173. Saving notes rebuilds `index.html` and refreshes the preview. Keep the preview window open while writing. `../Update Site.cmd` performs one build without starting a preview. Both use Node.js (on PATH, or the existing bundled runtime on this computer); no package installation is needed.

Only entries with `status: published` are included. Neither command commits, pushes, or publishes. Push manually when ready. Source notes are outside this repository and need a separate vault backup. The layout template is `site/template.html`; renderer and preview code are in `tools/`. Marked 17.0.5 is vendored with its MIT license in `tools/vendor/`.

The water background, animated fish frames, and Departure Mono font are embedded in the HTML. The Departure Mono license is included in an HTML comment. Inconsolata loads from Google Fonts, with a monospace fallback.

## Publish

Push this repository to GitHub. For GitHub Pages, configure publishing from the `main` branch and the repository root (`/`). The entry point is `index.html`.

Navigation, archive, dates, project and reading panels, home cards, and section links are generated from notes. Comments and annotations remain unimplemented.
