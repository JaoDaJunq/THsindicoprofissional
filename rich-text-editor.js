(() => {
  'use strict';

  const ALLOWED = new Set(['P','BR','STRONG','B','EM','I','U','S','UL','OL','LI','A','BLOCKQUOTE']);
  const DROP_CONTENT = new Set(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','SVG','MATH','TEMPLATE']);

  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'
  })[ch]);

  function normalizeHref(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^(https?:|mailto:|tel:)/i.test(raw)) return raw;
    if (/^[\w.-]+\.[a-z]{2,}(?:[/?#].*)?$/i.test(raw)) return 'https://' + raw;
    return '';
  }

  function sanitizeNode(node, doc) {
    if (node.nodeType === Node.TEXT_NODE) return doc.createTextNode(node.nodeValue || '');
    if (node.nodeType !== Node.ELEMENT_NODE) return null;

    const tag = node.tagName.toUpperCase();
    if (DROP_CONTENT.has(tag)) return null;

    const children = [...node.childNodes].map(child => sanitizeNode(child, doc)).filter(Boolean);

    if (!ALLOWED.has(tag)) {
      const frag = doc.createDocumentFragment();
      children.forEach(child => frag.appendChild(child));
      return frag;
    }

    const normalizedTag = tag === 'B' ? 'strong' : tag === 'I' ? 'em' : tag.toLowerCase();
    const clean = doc.createElement(normalizedTag);

    if (tag === 'A') {
      const href = normalizeHref(node.getAttribute('href'));
      if (href) {
        clean.setAttribute('href', href);
        clean.setAttribute('target', '_blank');
        clean.setAttribute('rel', 'noopener noreferrer');
      }
    }

    children.forEach(child => clean.appendChild(child));
    return clean;
  }

  function sanitizeHtml(value) {
    const raw = String(value || '');
    const parser = new DOMParser();
    const parsed = parser.parseFromString(raw, 'text/html');
    const source = parsed.body;
    const holder = document.createElement('div');
    [...(source?.childNodes || [])].forEach(node => {
      const clean = sanitizeNode(node, document);
      if (clean) holder.appendChild(clean);
    });
    return holder.innerHTML
      .replace(/<p>(?:\s|<br\s*\/?>)*<\/p>/gi, '')
      .trim();
  }

  function looksRich(value) {
    return /<\/?(?:p|br|strong|b|em|i|u|s|ul|ol|li|a|blockquote)\b/i.test(String(value || ''));
  }

  function legacyToHtml(value) {
    const raw = String(value || '');
    if (!raw) return '';
    if (looksRich(raw)) return sanitizeHtml(raw);
    return escapeHtml(raw).replace(/\r?\n/g, '<br>');
  }

  function render(value) {
    return legacyToHtml(value);
  }

  function plainText(value) {
    const div = document.createElement('div');
    div.innerHTML = render(value);
    div.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
    div.querySelectorAll('p,li,blockquote').forEach(block => block.append('\n'));
    return (div.textContent || '').replace(/\u00a0/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  }

  function commandButton(command, label, title, extra='') {
    return '<button type="button" class="gc-rich-btn" data-rich-command="' + command + '" title="' + title + '" aria-label="' + title + '" ' + extra + '>' + label + '</button>';
  }

  function toolbarHtml() {
    return [
      commandButton('bold','<strong>B</strong>','Negrito (Ctrl+B)'),
      commandButton('italic','<em>I</em>','Itálico (Ctrl+I)'),
      commandButton('underline','<u>U</u>','Sublinhado (Ctrl+U)'),
      commandButton('strikeThrough','<s>S</s>','Tachado'),
      '<span class="gc-rich-separator" aria-hidden="true"></span>',
      commandButton('insertUnorderedList','• Lista','Lista com marcadores'),
      commandButton('insertOrderedList','1. Lista','Lista numerada'),
      '<span class="gc-rich-separator" aria-hidden="true"></span>',
      commandButton('createLink','🔗','Inserir link'),
      commandButton('removeFormat','Tx','Limpar formatação'),
      '<span class="gc-rich-separator" aria-hidden="true"></span>',
      commandButton('undo','↶','Desfazer'),
      commandButton('redo','↷','Refazer')
    ].join('');
  }

  function selectionInside(editor) {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return false;
    const node = sel.anchorNode;
    return Boolean(node && editor.contains(node.nodeType === 3 ? node.parentNode : node));
  }

  function updateActiveState(wrapper) {
    const editor = wrapper.querySelector('.gc-rich-editor');
    if (!editor || !selectionInside(editor)) return;
    const stateCommands = ['bold','italic','underline','strikeThrough','insertUnorderedList','insertOrderedList'];
    wrapper.querySelectorAll('[data-rich-command]').forEach(button => {
      const command = button.dataset.richCommand;
      if (!stateCommands.includes(command)) {
        button.classList.remove('is-active');
        return;
      }
      let active = false;
      try { active = document.queryCommandState(command); } catch (_) {}
      button.classList.toggle('is-active', Boolean(active));
    });
  }

  function sync(wrapper, cleanEditor=false) {
    const source = wrapper.querySelector('textarea[data-rich-text]');
    const editor = wrapper.querySelector('.gc-rich-editor');
    if (!source || !editor) return;
    const clean = sanitizeHtml(editor.innerHTML);
    source.value = clean;
    if (cleanEditor && editor.innerHTML !== clean) editor.innerHTML = clean;
    source.dispatchEvent(new Event('input', { bubbles:true }));
  }

  function insertLink(editor) {
    const entered = window.prompt('Cole o link:');
    if (entered === null) return;
    const href = normalizeHref(entered);
    if (!href) {
      if (typeof window.flash === 'function') window.flash('Informe um link válido, como https://exemplo.com.');
      return;
    }

    editor.focus();
    const sel = window.getSelection();
    const hasSelection = sel && sel.rangeCount && !sel.getRangeAt(0).collapsed && selectionInside(editor);

    if (hasSelection) {
      document.execCommand('createLink', false, href);
    } else {
      const safeHref = escapeHtml(href);
      document.execCommand('insertHTML', false, '<a href="' + safeHref + '" target="_blank" rel="noopener noreferrer">' + safeHref + '</a>');
    }
  }

  function mount(source) {
    if (!source || source.dataset.richMounted === 'true' || source.disabled) return;
    source.dataset.richMounted = 'true';

    const wasRequired = source.required;
    if (wasRequired) {
      source.required = false;
      source.dataset.richRequired = 'true';
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'gc-rich-text';
    wrapper.innerHTML = '<div class="gc-rich-toolbar" role="toolbar" aria-label="Formatação de texto">' + toolbarHtml() + '</div><div class="gc-rich-editor" contenteditable="true" role="textbox" aria-multiline="true"></div>';

    source.parentNode.insertBefore(wrapper, source);
    wrapper.appendChild(source);
    source.classList.add('gc-rich-source');

    const editor = wrapper.querySelector('.gc-rich-editor');
    editor.innerHTML = legacyToHtml(source.value);
    editor.dataset.placeholder = source.getAttribute('placeholder') || 'Digite o texto...';

    const onInput = () => sync(wrapper, false);
    editor.addEventListener('input', onInput);
    editor.addEventListener('blur', () => sync(wrapper, true));
    editor.addEventListener('paste', event => {
      event.preventDefault();
      const text = event.clipboardData?.getData('text/plain') || '';
      document.execCommand('insertText', false, text);
    });

    wrapper.querySelectorAll('[data-rich-command]').forEach(button => {
      button.addEventListener('mousedown', event => event.preventDefault());
      button.addEventListener('click', () => {
        const command = button.dataset.richCommand;
        editor.focus();
        if (command === 'createLink') insertLink(editor);
        else document.execCommand(command, false, null);
        sync(wrapper, true);
        updateActiveState(wrapper);
      });
    });

    editor.addEventListener('keyup', () => updateActiveState(wrapper));
    editor.addEventListener('mouseup', () => updateActiveState(wrapper));
    editor.addEventListener('focus', () => updateActiveState(wrapper));
  }

  function mountWithin(root=document) {
    root.querySelectorAll?.('textarea[data-rich-text]').forEach(mount);
  }

  function validateForm(form) {
    let firstInvalid = null;
    form.querySelectorAll('textarea[data-rich-text][data-rich-required="true"]').forEach(source => {
      const wrapper = source.closest('.gc-rich-text');
      if (wrapper) sync(wrapper, true);
      const invalid = !plainText(source.value);
      wrapper?.classList.toggle('has-error', invalid);
      if (invalid && !firstInvalid) firstInvalid = wrapper?.querySelector('.gc-rich-editor');
    });
    if (firstInvalid) {
      firstInvalid.focus();
      if (typeof window.flash === 'function') window.flash('Preencha o campo de texto.');
      return false;
    }
    return true;
  }

  document.addEventListener('submit', event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    form.querySelectorAll('.gc-rich-text').forEach(wrapper => sync(wrapper, true));
    if (!validateForm(form)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  const observer = new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => {
      if (node.nodeType !== 1) return;
      if (node.matches?.('textarea[data-rich-text]')) mount(node);
      mountWithin(node);
    }));
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      mountWithin();
      observer.observe(document.body, { childList:true, subtree:true });
    }, { once:true });
  } else {
    mountWithin();
    observer.observe(document.body, { childList:true, subtree:true });
  }

  window.GCRichText = {
    sanitize: sanitizeHtml,
    render,
    plainText,
    mount,
    mountWithin,
    sync(wrapper) { sync(wrapper, true); }
  };
})();