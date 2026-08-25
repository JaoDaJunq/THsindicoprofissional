(() => {
  const applySecurityUi = () => {
    const signupButton = document.querySelector('#cloud-signup-open');
    if (signupButton) signupButton.remove();

    document.querySelectorAll('.auth-divider').forEach((el) => el.remove());

    const card = document.querySelector('.auth-card');
    if (card && !card.querySelector('[data-access-note]')) {
      const note = document.createElement('p');
      note.dataset.accessNote = 'true';
      note.className = 'auth-footnote';
      note.textContent = 'Acessos de gestão são autorizados pelo sistema. Moradores entram por convite do síndico.';
      card.appendChild(note);
    }
  };

  const observer = new MutationObserver(applySecurityUi);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  applySecurityUi();
})();