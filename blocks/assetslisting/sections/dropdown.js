/*
 * Generic dropdown structure + open/close helpers.
 *
 * Follows the app's delegated-click convention (see events.js): this module
 * only builds markup and flips the open/closed attributes — it doesn't bind
 * its own listeners, so it keeps working after the shell is rebuilt (e.g. on
 * folder navigation) without any rebinding.
 */

/**
 * Wraps a trigger and a panel in a `position: relative` root, wired for
 * open/close via aria-expanded + [hidden].
 * @param {HTMLElement} trigger The element whose click opens/closes the panel
 * @param {HTMLElement} panel The panel to show/hide
 * @returns {HTMLElement}
 */
export function createDropdown(trigger, panel) {
  const root = document.createElement('div');
  root.className = 'dropdown';

  panel.classList.add('dropdown-panel');
  panel.hidden = true;
  trigger.setAttribute('aria-haspopup', 'true');
  trigger.setAttribute('aria-expanded', 'false');

  root.append(trigger, panel);
  return root;
}

export function isDropdownOpen(trigger) {
  return trigger.getAttribute('aria-expanded') === 'true';
}

export function openDropdown(trigger, panel) {
  trigger.setAttribute('aria-expanded', 'true');
  panel.hidden = false;
}

export function closeDropdown(trigger, panel) {
  trigger.setAttribute('aria-expanded', 'false');
  panel.hidden = true;
}

export function toggleDropdown(trigger, panel) {
  if (isDropdownOpen(trigger)) closeDropdown(trigger, panel);
  else openDropdown(trigger, panel);
}

/**
 * Closes every open dropdown under `root` (click-outside / Escape / navigation).
 * Looks up each panel's trigger by [aria-haspopup] within the same `.dropdown`
 * root rather than assuming DOM adjacency, since a trigger may be wrapped
 * alongside sibling controls (e.g. the sort control's direction button).
 * @param {Element} root
 */
export function closeAllDropdowns(root) {
  root.querySelectorAll('.dropdown-panel:not([hidden])').forEach((panel) => {
    const trigger = panel.closest('.dropdown')?.querySelector('[aria-haspopup="true"]');
    if (trigger) closeDropdown(trigger, panel);
    else panel.hidden = true;
  });
}
