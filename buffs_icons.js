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
  };

  const ICON_LABELS = {
    focus: 'F',
    stamina: 'K',
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
