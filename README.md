# Personal research website

A static personal website for Nellie Gregg, with Home, Research Blog, Projects, Further Reading, and Archive views. Content currently uses placeholders. Each blog post includes CommentBox comments and a Comments link in its sidebar. Annotations are not implemented.

## Preview and edit

Content is generated from the Markdown notes in the parent Obsidian vault. See `../Writing Guide.md` for properties, formatting, images, and templates. Do not edit `index.html` directly.

After editing notes, double-click `../Update Site.cmd` to rebuild `index.html`, then open or refresh `index.html` in a browser. The updater uses Node.js (on PATH, or the existing bundled runtime on this computer); no package installation is needed.

Only entries with `status: published` are included. The command does not commit, push, or publish. Push manually when ready. Source notes are outside this repository and need a separate vault backup. The layout template is `site/template.html`; builder and navigation code are in `tools/`. Marked 17.0.5 is vendored with its MIT license in `tools/vendor/`.

The water background, animated fish frames, and Departure Mono font are embedded in the HTML. The Departure Mono license is included in an HTML comment. Inconsolata loads from Google Fonts, with a monospace fallback.

## Publish

Push this repository to GitHub. For GitHub Pages, configure publishing from the `main` branch and the repository root (`/`). The entry point is `index.html`.

Navigation, archive, dates, project and reading panels, home cards, and section links are generated from notes. Comments load when a blog post is opened on the published website. Each post uses its slug to keep its discussion separate; keep published slugs stable to preserve comment links. The CommentBox project ID is stored in `../Home/Site.md`. CommentBox requires an internet connection and the published domain to be allowed in its project settings. Local `file://` previews show a notice in place of the live widget. Annotations remain unimplemented.
