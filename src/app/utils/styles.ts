/** Focus-visible ring applied to interactive elements. */
export const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent-400';

/** Shared sidebar list-item styles used by Sidebar and ChatList. */
export const listItemBase = `flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-150 cursor-pointer ${focusRing}`;
export const listItemActive = 'bg-accent-600/15 text-accent-400 font-medium shadow-sm shadow-accent-500/5';
export const listItemInactive = 'text-surface-300 hover:bg-surface-700/40 hover:text-surface-100';
export const listContainer = 'flex flex-col gap-1 px-2';

/** Section heading style used across sidebar and content areas. */
export const sectionHeading = 'text-[11px] font-semibold uppercase tracking-widest text-surface-400/80';

/** Smaller section label used for breadcrumbs, prompt tags, and popover headers. */
export const sectionLabel = 'text-[10px] font-semibold uppercase tracking-widest text-surface-500/80';

/** Popover panel chrome shared by dropdown menus and branch popovers. */
export const popoverPanel = 'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 rounded-xl border border-surface-600/60 bg-surface-800 shadow-xl shadow-shadow-color';

/** Active/inactive styles for menu items inside popovers. */
export const menuItemActive = 'text-accent-300 bg-accent-600/10';
export const menuItemInactive = 'text-surface-300 hover:bg-surface-700/50 hover:text-surface-100';
