import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
await build({stdin:{contents:`export {initializeApp} from 'firebase/app';export {getAuth,GoogleAuthProvider,signInWithPopup,onAuthStateChanged,signOut} from 'firebase/auth';export {getFirestore,doc,getDocFromServer,runTransaction,serverTimestamp} from 'firebase/firestore';`,resolveDir:root},bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,outfile:root+'src/firebase-sdk.js',legalComments:'eof'});
