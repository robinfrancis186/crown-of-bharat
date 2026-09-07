# Connected services

- GitHub: https://github.com/robinfrancis186/monsoon-kingdoms (private).
- Vercel project: https://vercel.com/robin-francis-projects/monsoon-kingdoms
- Supabase project: https://supabase.com/dashboard/project/wcihordgjxybhndvlnak

The browser uses the existing Supabase publishable key in `monsoon-kingdoms/src/net.js`. It is intentionally public; no database password, service-role key or account access token is shipped. Online progress uses the existing RPC functions. Ordinary village saves remain in browser local storage; use Settings export/import when changing URLs.

Vercel installs with `npm ci`, runs the fast rules suite, and builds the self-contained release using `vercel.json`. The deployment root is `monsoon-kingdoms/release/monsoon-kingdoms`. Pushes to the connected main branch deploy production; other branches create previews. Vercel's native Git connection handles this without GitHub Actions secrets.

Source, runtime assets, Blender scene files and authoring scripts are versioned. Generated release folders, screenshots, local settings, credentials, 4K masters and 4096-pixel texture sources remain on T7 and are excluded from Git and deployment. Keep a separate backup of those authoring masters.

## Verify

```
npm ci
npm --prefix monsoon-kingdoms run test:fast
node monsoon-kingdoms/tools/verify-backend.mjs
node monsoon-kingdoms/tools/build-release.mjs
```

The backend health check is read-only; it does not register test players, publish villages or modify rankings. Supabase schema administration is separate from this frontend connection.
