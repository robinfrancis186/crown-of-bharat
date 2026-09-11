Run from the repository root with Java 21+ and Firebase CLI installed:

```sh
npm --prefix monsoon-kingdoms/tools/firestore-tests ci
firebase emulators:exec --only firestore --project demo-monsoon-rules 'node monsoon-kingdoms/tools/firestore-tests/verify.mjs'
```

The suite requires FIRESTORE_EMULATOR_HOST and uses a demo project. It never writes real accounts. It exercises ownership/provider boundaries, stale and skipped revisions, document schema and field limits, server timestamps, and default-denied collection/list/delete access.
