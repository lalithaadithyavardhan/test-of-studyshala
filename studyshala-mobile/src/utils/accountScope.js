/**
 * utils/accountScope.js
 * ========================
 * The real bug this fixes: our local storage (saved materials, starred
 * files, recently-opened, access history) was one single shared bucket on
 * the phone — it had no idea which logged-in account it belonged to. If
 * Student A logged out and Student B logged in with a different Google
 * account on the same phone, B would see A's personal lists until the next
 * server sync happened to overwrite them.
 *
 * Fix: every personal-data storage key gets prefixed with the current
 * account's identity via scopedKey(). AuthContext calls setCurrentAccount()
 * on login/session-restore/logout so this always reflects who's actually
 * signed in right now.
 *
 * Downloaded FILE BYTES themselves are deliberately NOT scoped this way —
 * per product decision, those stay in one shared pool on the device (no
 * point re-downloading an identical course PDF twice just because a
 * different account is active). Only the personal lists/bookmarks are
 * private per account.
 */
let currentAccountKey = 'anonymous';

/** Call this from AuthContext right after user state changes (login, session restore, logout). */
export const setCurrentAccount = (identifier) => {
  currentAccountKey = identifier || 'anonymous';
};

export const getCurrentAccount = () => currentAccountKey;

/** Wrap any personal-data storage key with the current account's identity. */
export const scopedKey = (key) => `acct:${currentAccountKey}:${key}`;

export default { setCurrentAccount, getCurrentAccount, scopedKey };