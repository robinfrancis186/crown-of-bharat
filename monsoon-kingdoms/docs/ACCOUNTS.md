# Google accounts

Firebase project: monsoon-kingdoms-186. Firestore location: asia-south1.
Google authentication is mandatory before game initialization. The public Firebase web configuration is bundled; no administrative credentials ship to browsers.

## Activation blocker
Standard Firebase Authentication must be initialized in the Firebase console and Google enabled with a support email. Add monsoon-kingdoms.vercel.app and localhost to Authentication authorized domains. The public initializeAuth API requires billing; billing has not been enabled. Do not deploy this mandatory gate to production until a real Google login and subsequent logout/relogin have been verified.

## Save behavior
Each UID has its own local storage namespace and private kingdoms/{uid} Firestore document. Existing guest saves are not automatically assigned to an account. The storage adapter synchronizes kingdom, preferences and private existing Supabase identity together. Revision transactions reject simultaneous-session overwrites. Conflicts stop play and retain a local recovery archive; download recovery backup before reloading and import through Settings if needed. A server read is required to enter; offline login is not supported. Local writes survive cloud failures, and sign-out refuses to continue until pending cloud writes succeed. Browser clearing can still remove unsynced progress.

Rules require a Google-authenticated matching UID, schema/size validation, sequential revisions and server timestamps. Tests: tools/verify-account-store.mjs and tools/firestore-tests/README.md. Firestore emulator tests cover 37 permissions and schema cases. UI tests that replace the SDK are mocked tests, not proof of real Google OAuth.

This does not make game combat server-authoritative, implement anti-cheat, provide account deletion, or complete release/privacy policy and device certification. These remain release requirements before broad public launch.
