import {initializeApp,getAuth,GoogleAuthProvider,signInWithPopup,onAuthStateChanged,signOut,getFirestore} from './firebase-sdk.js';
import {firebaseConfig} from './firebase-config.js';
import {mountAccountGate} from './account-ui.js';
import {openAccountStore} from './account-store.js';

// Gameplay receives storage only after Google identity and its server save are verified.
export function requireAccount(){
  return new Promise(resolve=>{
    const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
    let session=null,started=false,generation=0,blocked=true,conflict=false,status='Your kingdom is saved to your Google account.';
    const inert=value=>{blocked=value;for(const id of ['world','ui']){const el=document.getElementById(id);if(el)el.inert=value;}};
    const show=(state,message,user=auth.currentUser)=>{inert(true);gate.show({status:state,message,user});};
    const explain=error=>({
      'auth/popup-closed-by-user':'Sign-in was cancelled. Continue with Google when you are ready.',
      'auth/popup-blocked':'Your browser blocked Google sign-in. Allow popups for this site and try again.',
      'auth/unauthorized-domain':'Google sign-in is not configured for this address yet.',
      'auth/operation-not-allowed':'Google sign-in needs to be enabled by the game administrator.',
      'auth/configuration-not-found':'Google sign-in setup is not complete yet. Please try again after setup.',
      'auth/network-request-failed':'Could not reach Google. Check your connection and try again.'
    }[error?.code]||'Could not securely open your kingdom. Check your connection and try again.');
    async function login(){
      show('signing-in','Opening Google sign-in…',null);
      try{const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});await signInWithPopup(auth,provider);}
      catch(error){if(!session)show('error',explain(error),null);}
    }
    async function load(user){
      const current=++generation;
      if(started){inert(true);session?.close();location.reload();return;}
      if(!user){show('idle','Sign in to start your own kingdom.',null);return;}
      if(!user.providerData.some(p=>p.providerId==='google.com')){await signOut(auth);show('error','Please use a Google account to play.',null);return;}
      show('syncing','Opening your saved kingdom…',user);
      try{
        let local;try{local=window.localStorage;}catch{throw new Error('storage unavailable');}
        const next=await openAccountStore({db,uid:user.uid,localStorage:local,onStatus:update=>{
          status=update.message|| (update.state==='saved'?'Your kingdom is saved to your Google account.':'Saving your kingdom…');
          if(update.state==='error')window.dispatchEvent(new CustomEvent('kingdom-sync-error',{detail:{message:status}}));
          if(update.state==='conflict'){conflict=true;show('error',status);}
        }});
        if(current!==generation||auth.currentUser?.uid!==user.uid){next.close();return;}
        session=next;started=true;
        const account={storage:next.storage,get blocked(){return blocked;},show(){show('ready',status);},flush:()=>next.flush()};
        inert(false);gate.hide();resolve(account);
      }catch(error){if(current===generation)show('error',explain(error),user);}
    }
    const gate=mountAccountGate({onBackup:()=>{
      const uid=auth.currentUser?.uid;if(!uid)return;
      const prefix=`monsoon.account.${uid}.`;
      let raw=localStorage.getItem(prefix+'monsoon.kingdoms.v1');
      const keys=Object.keys(localStorage).filter(k=>k.startsWith(prefix+'pending.')).sort();
      if(keys.length){try{raw=JSON.parse(localStorage.getItem(keys.at(-1))).kingdom||raw;}catch{}}
      if(!raw){show('ready','There is no saved kingdom to export yet.');return;}
      const url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));
      const a=document.createElement('a');a.href=url;a.download='kingdom-recovery.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    },onSignIn:login,onRetry:()=>{
      if(conflict){location.reload();return;}
      if(started){session.flush().then(ok=>show(ok?'ready':'error',status));return;}
      if(auth.currentUser)load(auth.currentUser);else login();
    },onContinue:()=>{if(session&&!conflict){inert(false);gate.hide();}},onSignOut:async()=>{
      show('signing-out','Saving before signing out…');
      try{if(session&&!await session.flush()){show('error','Your latest progress has not reached the cloud. Check your connection and retry before signing out.');return;}await signOut(auth);}catch(error){show('error',explain(error));}
    }});
    show('initializing','Checking your account…',null);
    onAuthStateChanged(auth,load,error=>show('error',explain(error),null));
    window.addEventListener('online',()=>{if(!conflict)session?.flush();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)session?.flush();});
  });
}
