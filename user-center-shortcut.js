(() => {
  'use strict';

  let scheduled = false;

  function accountInitials() {
    const visibleAvatar = document.querySelector('.top-actions .avatar:not(.uc-avatar-source-hidden), .resident-top .avatar:not(.uc-avatar-source-hidden)');
    const fromDom = visibleAvatar?.textContent?.trim();
    if (fromDom) return fromDom.slice(0, 2).toUpperCase();
    const fromData = window.data?.user?.initials;
    return String(fromData || 'EU').slice(0, 2).