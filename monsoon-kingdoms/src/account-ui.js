const GOOGLE_MARK = '<svg aria-hidden="true" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6C44.4 38.03 46.98 31.88 46.98 24.55Z"/><path fill="#FBBC05" d="M10.53 28.59A14.41 14.41 0 0 1 9.75 24c0-1.59.27-3.13.78-4.59l-7.98-6.19A23.85 23.85 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/></svg>';

/** The gate never starts play itself. Only the auth coordinator may hide it. */
export function mountAccountGate({ onSignIn, onRetry, onSignOut, onContinue, onBackup } = {}) {
  const existing = document.getElementById('account-gate');
  const host = existing || document.body.appendChild(document.createElement('section'));
  host.id = 'account-gate';
  host.hidden = true;
  host.setAttribute('aria-labelledby', 'account-heading');
  host.innerHTML = `
    <div class="account-shell">
      <div class="account-world" aria-hidden="true">
        <div class="account-wordmark"><span>CROWN OF</span><span>BHARAT</span></div>
        <div class="account-art"><div class="account-halo"></div><img src="./assets/buildings/fort.png" alt="" draggable="false"></div>
        <p class="account-world-caption">A kingdom worth returning to.</p>
      </div>
      <div class="account-panel">
        <div class="account-crest" aria-hidden="true">✦</div>
        <p class="account-eyebrow">YOUR STORY STARTS HERE</p>
        <h1 id="account-heading" tabindex="-1">Build your kingdom.<br>Make it yours.</h1>
        <p class="account-description">Sign in with Google to play and save your kingdom to your account.</p>
        <div class="account-identity" hidden><span class="account-avatar" aria-hidden="true"></span><div><strong class="account-name"></strong><span class="account-email"></span></div></div>
        <p class="account-status" role="status" aria-live="polite" aria-atomic="true"></p>
        <p class="account-error" role="alert" aria-atomic="true" hidden></p>
        <button class="account-google" type="button">${GOOGLE_MARK}<span>Continue with Google</span></button>
        <button class="account-retry" type="button" hidden>Try again</button>
        <button class="account-continue" type="button" hidden>Enter your kingdom</button>
        <button class="account-signout" type="button" hidden>Use a different Google account</button>
        <button class="account-backup account-signout" type="button" hidden>Download recovery backup</button><p class="account-footnote">Google sign-in is required to enter the game.</p>
      </div>
    </div>`;
  const get = name => host.querySelector(`.account-${name}`);
  let state = 'idle';
  let destroyed = false;
  const listeners = [];
  const bind = (name, callback) => {
    const el = get(name);
    const handler = () => {
      if (!el.disabled && !el.hidden && !host.hidden && !destroyed) callback?.();
    };
    el.addEventListener('click', handler);
    listeners.push(() => el.removeEventListener('click', handler));
  };
  bind('google', onSignIn);
  bind('backup', onBackup);
  bind('retry', onRetry || onSignIn);
  bind('signout', onSignOut);
  bind('continue', () => { if (state === 'ready') onContinue?.(); });
  return {
    show({ status = 'idle', message = '', user = null } = {}) {
      if (destroyed) return;
      const wasHidden = host.hidden;
      state = status;
      host.hidden = false;
      const loading = ['loading', 'initializing', 'signing-in', 'syncing', 'signing-out'].includes(status);
      const error = ['error', 'account-changed', 'unavailable'].includes(status);
      host.dataset.status = status;
      host.setAttribute('aria-busy', String(loading));
      get('status').textContent = error ? '' : message || (loading ? 'Getting your kingdom ready…' : status === 'ready' ? 'Your kingdom is ready.' : 'Your next chapter awaits.');
      get('error').textContent = error ? message || 'We couldn’t sign you in. Please try again.' : '';
      get('error').hidden = !error;
      get('google').hidden = error || Boolean(user) || status === 'ready';
      get('google').disabled = loading;
      get('google').querySelector('span').textContent = loading ? 'Connecting…' : 'Continue with Google';
      get('retry').hidden = !error;
      get('retry').disabled = loading;
      get('continue').hidden = status !== 'ready' || !onContinue;
      get('signout').hidden = !user || !onSignOut;
      get('signout').disabled = loading;
      get('identity').hidden = !user;
      get('backup').hidden = !user || !onBackup;
      get('name').textContent = user?.displayName || 'Your Google account';
      get('email').textContent = user?.email || '';
      get('avatar').textContent = (user?.displayName || user?.email || 'K').slice(0, 1).toUpperCase();
      if (wasHidden) host.querySelector('h1').focus({ preventScroll: true });
    },
    hide() { if (!destroyed) host.hidden = true; },
    destroy() { listeners.forEach(remove => remove()); host.remove(); destroyed = true; }
  };
}
