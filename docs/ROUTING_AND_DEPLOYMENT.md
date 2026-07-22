# Routing and Deployment

Dragonfire Lab uses a small typed History API router. Ordinary navigation uses real same-origin anchors and clean canonical paths:

- `/overview`
- `/roster`
- `/formations`
- `/optimizer`
- `/about`
- `/updates`

The root path, unknown paths, and trailing-slash variants are normalized with `history.replaceState`. Unmodified same-origin clicks use `history.pushState`; modified clicks, middle clicks, downloads, external URLs, and new-tab targets retain native browser behavior. A `popstate` subscription restores the historical route without remounting the application, so the selected optimizer strategy and completed in-memory result survive Back/Forward navigation.

Formation sharing remains hash-based data attached to the clean Formation Builder path: `/formations#formation=...`. Legacy `#team=` links remain readable. The retired `#database`, `#dragon-database`, and `#dragons` fragments migrate to `/roster`; `#data-status` migrates to `/updates`. Unknown fragments are preserved during startup so Supabase authentication and password-recovery fragments remain available to the auth client.

Production uses the custom-domain GitHub Pages root. Vite's production base is `/`, and Rollup builds both `index.html` and `404.html` as equivalent React entries with root-relative assets. When GitHub Pages serves `404.html` for a direct deep link, the browser retains the requested pathname and the application router renders that route. The fallback does not rewrite the URL to a query-string route, use a service worker, or alter emitted HiGHS WASM and worker asset locations.

Route changes update the document title, canonical link, and `og:url` using the production origin `https://dragonfirelab.com`.
