(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BUFF_ICONS = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  const ICON_SVGS = {
    focus: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="6" /><line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" /></svg>',
    stamina: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 L4 14 H11 L9 22 L20 9 H13 Z" /></svg>',
    precision: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="3" /><line x1="12" y1="2" x2="12" y2="5" /><line x1="12" y1="19" x2="12" y2="22" /><line x1="2" y1="12" x2="5" y2="12" /><line x1="19" y1="12" x2="22" y2="12" /></svg>',
    challenge: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 19 L10 9 L14 14 L21 5" /><path d="M16 5 H21 V10" /></svg>',
    explorer: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" /><path d="M9 9 L15 12 L9 15 Z" /><line x1="12" y1="3" x2="12" y2="5" /><line x1="12" y1="19" x2="12" y2="21" /></svg>',
    crown: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18 L5 7 L12 13 L19 7 L21 18 Z" /><line x1="3" y1="18" x2="21" y2="18" /></svg>',
  };

  const ICON_LABELS = {
    focus: 'F',
    stamina: 'K',
    precision: 'P',
    challenge: 'K',
    explorer: 'E',
    crown: 'B',
  };

  function getIconSvg(token) {
    return ICON_SVGS[token] || '';
  }

  function getIconLabel(token) {
    return ICON_LABELS[token] || '?';
  }

  return {
    ICON_SVGS,
    ICON_LABELS,
    getIconSvg,
    getIconLabel,
  };
});
