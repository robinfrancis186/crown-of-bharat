# Google accounts

Firebase project: monsoon-kingdoms-186. Firestore location: asia-south1.
Google authentication is mandatory before game initialization. The public Firebase web configuration is bundled; no administrative credentials ship to browsers.

## Activation and verification
Standard Firebase Authentication and Google sign-in are enabled. Public app name: Monsoon Kingdoms. The production domain monsoon-kingdoms.vercel.app is authorized alongside Firebase defaults and localhost. No billing upgrade was needed.

A real Google sign-in opened the local game on 2026-09-11. A separate authenticated Firestore API read confirmed a kingdom document at revision 4. Simulated logout, account switching, failed-write recovery and ownership tests passed earlier. A real logout/relogin and production-device check remain to be completed; these are not implied by the simulated tests.

## Save behavior
Each UID has its own local storage namespace and private kingdoms/{uid} Firestore document. Existing guest saves are not automatically assigned to an account. The storage adapter synchronizes kingdom, preferences and private existing Supabase identity together. Revision transactions reject simultaneous-session overwrites. Conflicts stop play and retain a local recovery archive; download recovery backup before reloading and import through Settings if needed. A server read is required to enter; offline login is not supported. Local writes survive cloud failures, and sign-out refuses to continue until pending cloud writes succeed. Browser clearing can still remove unsynced progress.

Rules require a Google-authenticated matching UID, schema/size validation, sequential revisions and server timestamps. Tests: tools/verify-account-store.mjs and tools/firestore-tests/README.md. Firestore emulator tests cover 37 permissions and schema cases. UI tests that replace the SDK are mocked tests, not proof of real Google OAuth.

This does not make game combat server-authoritative, implement anti-cheat, provide account deletion, or complete release/privacy policy and device certification. These remain release requirements before broad public launch.
