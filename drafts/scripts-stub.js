/*
 * Stand-in for scripts/scripts.js used ONLY by drafts/sharelinks-harness.html
 * (via an import map), so the block can be rendered without booting the whole
 * app — importing the real scripts.js would trigger the auth guard/redirect.
 */
// The harness imports the same named export the real module exposes. Same
// detection as the real isEditMode, so the harness can exercise the editor
// preview by injecting a [data-aue-resource] marker before decorating.
// eslint-disable-next-line import/prefer-default-export
export function isEditMode() {
  return document.querySelector('[data-aue-resource], [data-richtext-resource]') !== null;
}
