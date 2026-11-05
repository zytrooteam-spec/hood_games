/**
 * Deep equality & state helper utility for silent background sync
 * Prevents unnecessary React re-renders, scroll jumps, and input focus loss
 */

export function areEqual(a, b) {
  // 1. Primitive / Reference equality
  if (Object.is(a, b)) return true;

  // 2. Null or undefined checks
  if (a == null || b == null) return a === b;

  // 3. Different types
  if (typeof a !== typeof b) return false;

  // 4. Date comparison
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  // 5. RegExp comparison
  if (a instanceof RegExp && b instanceof RegExp) {
    return a.toString() === b.toString();
  }

  // 6. Array comparison
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!areEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (Array.isArray(b)) return false;

  // 7. Object comparison
  if (typeof a === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;

    for (let i = 0; i < keysA.length; i++) {
      const key = keysA[i];
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!areEqual(a[key], b[key])) return false;
    }
    return true;
  }

  return false;
}

/**
 * State update helper that returns previous state reference if deep equal
 * Leverages React's Object.is bailout to completely skip re-rendering
 */
export function diffSet(setter, nextVal) {
  if (typeof setter !== 'function') return;
  setter((prev) => {
    // If nextVal is a function updater
    const resolvedNext = typeof nextVal === 'function' ? nextVal(prev) : nextVal;
    return areEqual(prev, resolvedNext) ? prev : resolvedNext;
  });
}

/**
 * Sanitizes game platform titles by stripping non-breaking spaces (\u00a0) and trimming
 */
export function sanitizeGameTitle(title) {
  if (!title || typeof title !== 'string') return '';
  return title.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}
