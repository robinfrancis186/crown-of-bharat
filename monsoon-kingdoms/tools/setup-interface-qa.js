// Playwright CLI run-code: local disposable auth adapter; never contacts Firebase.
async (page) => {
 if(!["localhost","127.0.0.1"].includes(await page.evaluate(()=>location.hostname)))throw Error("QA adapter is restricted to localhost");
 const assert=(v,m)=>{if(!v)throw new Error(m);};
 const sdk=`
 const auth={currentUser:JSON.parse(sessionStorage.getItem('qa-user')||'null')};let listener;
 const user={uid:'qa-alice',displayName:'Alice Test',email:'alice@example.test',providerData:[{providerId:'google.com'}]};
 export const initializeApp=()=>({}),getAuth=()=>auth,getFirestore=()=>({});
 export class GoogleAuthProvider{setCustomParameters(){}}
 export function onAuthStateChanged(a,cb){listener=cb;queueMicrotask(()=>cb(a.currentUser));}
 export async function signInWithPopup(){await new Promise(r=>setTimeout(r,200));if(window.qaFail){throw {code:'auth/popup-closed-by-user'};}auth.currentUser=user;sessionStorage.setItem('qa-user',JSON.stringify(user));listener(user);}
 export async function signOut(){auth.currentUser=null;sessionStorage.removeItem('qa-user');listener(null);}
 export const doc=(db,c,uid)=>uid;
 const snapshot=uid=>({exists:()=>!!sessionStorage.getItem('qa-doc-'+uid),data:()=>JSON.parse(sessionStorage.getItem('qa-doc-'+uid))});
 export const getDocFromServer=async ref=>snapshot(ref);
 export const serverTimestamp=()=>123;
 export const runTransaction=async(db,cb)=>{if(window.qaFailSave)throw Error('QA offline');return cb({get:async ref=>snapshot(ref),set:(ref,data)=>sessionStorage.setItem('qa-doc-'+ref,JSON.stringify(data))});};
 window.qaSwitch=()=>{auth.currentUser={...user,uid:'qa-bob',displayName:'Bob Test'};sessionStorage.setItem('qa-user',JSON.stringify(auth.currentUser));listener(auth.currentUser);};
 `;
 await page.route('**/src/firebase-sdk.js',r=>r.fulfill({contentType:'text/javascript',body:sdk}));
 await page.evaluate(()=>{for(const k of Object.keys(sessionStorage))if(k.startsWith('qa-'))sessionStorage.removeItem(k);for(const k of Object.keys(localStorage))if(k.startsWith('monsoon.account.qa-'))localStorage.removeItem(k);});
 await page.setViewportSize({width:844,height:390});
 await page.reload();
 await page.getByRole('button',{name:'Continue with Google'}).click();
 await page.waitForFunction(()=>window.kingdom?.stats.loaded,{timeout:60000});
 await page.waitForTimeout(2000);
 console.log('STARTER',await page.evaluate(()=>({buildings:window.kingdom.state.buildings.map(b=>b.type),army:window.kingdom.state.army,stats:window.kingdom.stats})));
 await page.screenshot({path:'output/playwright/starter-village-844.png'});
 console.log(await page.locator('button').allTextContents());
}