# Design review page

Renders `docs/MENU_SCHEDULING_DESIGN.md` (the source of truth) into the review page published at
https://claude.ai/artifact/G4TdReMkf1fWtSDo52N9na. Edit the Markdown, then rebuild and republish to the same URL.

```powershell
$env:NODE_PATH = "$PWD\node_modules"; node docs\review-page\build_page.cjs docs\MENU_SCHEDULING_DESIGN.md docs\review-page\menu-scheduling-design.html
```

The built `.html` is not committed.
