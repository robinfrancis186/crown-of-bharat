# Current integration contract

`RULES.md` is the authoritative state, export and economy/battle contract. `src/main.js` connects those exports to `GameUI` actions; `src/view.js` owns rendering, picking, camera controls and asset lifecycles; `src/audio.js` synthesises every sound cue; `src/net.js` is the only module that talks to the network. See `DESIGN-RESEARCH.md` for the reference mechanics versus our local adaptation.

Grid:24×24, cell2world units, +Yup. Building origins atfootprintcenter: ((x+w/2-12)*2,0,(z+h/2-12)*2). Unit coordinates map through ((x-12)*2,0,(z-12)*2). All GLB origins are ground anchored. Every building has15 geometry-distinct levels. Base level1 uses assets/buildings/type.glb; levels2–15 use assets/buildings/levels/type/N.glb. Load only visible variants, deduplicate in-flight requests, and preserve the current model until its replacement loads. Heroes use assets/heroes/{veer,tara}.glb with heroId; ordinary troops use assets/units/type.glb.

Serve the parent project root onloopback5191; URL /monsoon-kingdoms/. Importmap reuses ../node_modules/three. Renderer uses shared static GLB geometry, instanced forest meshes and owned/disposable overlay materials. Placement preview meshes borrow geometry and must not dispose model geometry. Ground-footprint picking supplements hollow building meshes.

Snapshots include state, mode, catalog, units, heroes, raids, ranked, online, tutorial, capacity, selectedBuilding, placing, placementValid, placementReason, battle, selectedTroop, panel, upgradeTarget, finishTarget, attackTab, wallStart, soundEnabled and stats. `attackTab` is campaign, ranked or online. Wall previews carry line.cells/endpoints/cost/locked; second endpoint locks hover changes. Hero selection uses selectedTroop='hero'. Timed gem actions display confirmation before dispatch. Practice uses kind='practice', no rewards and full troop refunds.

Each of the six campaign roads has its own authored base in `LAYOUTS`, keyed by `raid.layout` so ranked raids inherit a real layout when they spread a campaign entry. Layouts are validated by `tools/verify-layouts.mjs` for bounds, overlap, a single capital, at least 200 free deployment tiles and a winnable clear time that rises along the road.

Onboarding is derived, not stored as a cursor: `tutorialState` returns the first step whose predicate is unmet, so a step already satisfied is skipped and an imported save is never dragged backwards. Only acknowledgements and a skip flag persist. Hero equipment is instant, costs only ore, never occupies a builder, and is applied through `heroBonus`; `heroInfo.current` and the unit produced by `deployHero` must stay identical.

Online play sends only a kingdom name, Taj level and completed-building layout. Any base arriving from another player is untrusted input: `validateLayout` rebuilds every structure from scratch and rejects rather than repairs. Battles are simulated on the attacking device; the server clamps stars, destruction and trophy movement and rate-limits attacks. `src/net.js` holds the endpoint and publishable key; no other module performs network I/O.

Every economic action and troop deployment persists immediately. Hydration migrates old layouts without replacing them. All domain logic remains in rules.js; UI must use query helpers for displayed costs/stats rather than duplicate formulas. Browser QA scripts reset their disposable test browser and must not run against a user save.

Mobile is landscape-only: portrait rotation blocks world input and pauses local combat; returning to landscape resumes without advancing the paused timer. Runtime portraits are512px and materials1024px; native4K authoring masters stay out of the shipped package.
