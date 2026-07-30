/*
 * Stand-in for scripts/scripts.js used ONLY by drafts/sharelinks-harness.html
 * (via an import map), so the block can be rendered without booting the whole
 * app — importing the real scripts.js would trigger the auth guard/redirect.
 */
// The harness imports the same named export the real module exposes.
// eslint-disable-next-line import/prefer-default-export
export function isEditMode() {
  return false;
}
