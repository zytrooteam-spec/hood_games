/**
 * Global Hood Games alert / confirm — rendered by HoodAlertProvider.
 * Falls back to native dialogs if provider is not mounted yet.
 */

let showAlertImpl = null;
let showConfirmImpl = null;

export function registerHoodAlertHandlers({ alert, confirm }) {
  showAlertImpl = alert;
  showConfirmImpl = confirm;
}

export function unregisterHoodAlertHandlers() {
  showAlertImpl = null;
  showConfirmImpl = null;
}

function nativeAlert(message) {
  if (typeof window !== 'undefined') window.alert(message);
}

function nativeConfirm(message) {
  if (typeof window !== 'undefined') return window.confirm(message);
  return false;
}

/**
 * @param {string | { title?: string, message: string, variant?: 'info'|'success'|'error'|'warning', confirmLabel?: string }}
 */
export function hoodAlert(input) {
  const opts = typeof input === 'string' ? { message: input } : input;
  const message = opts?.message ?? '';
  if (showAlertImpl) {
    showAlertImpl({ variant: 'info', confirmLabel: 'Got it', ...opts, message });
    return;
  }
  nativeAlert(message);
}

hoodAlert.info = (message, title = 'Heads up') =>
  hoodAlert({ variant: 'info', title, message, confirmLabel: 'Got it' });

hoodAlert.success = (message, title = 'Success') =>
  hoodAlert({ variant: 'success', title, message, confirmLabel: 'Nice' });

hoodAlert.error = (message, title = 'Something went wrong') =>
  hoodAlert({ variant: 'error', title, message, confirmLabel: 'OK' });

hoodAlert.warning = (message, title = 'Please check') =>
  hoodAlert({ variant: 'warning', title, message, confirmLabel: 'Understood' });

/**
 * @returns {Promise<boolean>}
 */
export function hoodConfirm(input) {
  const opts = typeof input === 'string' ? { message: input } : input;
  const message = opts?.message ?? '';
  if (showConfirmImpl) {
    return showConfirmImpl({
      variant: 'warning',
      title: 'Confirm action',
      confirmLabel: 'Yes, continue',
      cancelLabel: 'Cancel',
      ...opts,
      message,
    });
  }
  return Promise.resolve(nativeConfirm(message));
}
