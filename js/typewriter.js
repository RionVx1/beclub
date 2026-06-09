(function () {
  const CHAR_MS = 90;
  const SPACE_MS = 50;
  const LINE_MS = 420;
  const START_MS = 300;

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function charDelay(ch) {
    return ch === ' ' ? SPACE_MS : CHAR_MS;
  }

  function isMeaningfulNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent.length > 0;
    }
    return node.nodeType === Node.ELEMENT_NODE;
  }

  async function typeNodes(parent, nodes, root, caret) {
    for (const node of nodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        const textNode = document.createTextNode('');
        parent.appendChild(textNode);

        for (const ch of node.textContent) {
          if (ch === '\n') continue;
          textNode.textContent += ch;
          root.appendChild(caret);
          await delay(charDelay(ch));
        }
        continue;
      }

      if (node.nodeName === 'BR') {
        parent.appendChild(document.createElement('br'));
        root.appendChild(caret);
        await delay(LINE_MS);
        continue;
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = document.createElement(node.tagName.toLowerCase());
        if (node.className) el.className = node.className;
        parent.appendChild(el);
        await typeNodes(el, Array.from(node.childNodes), root, caret);
      }
    }
  }

  async function init(container) {
    const source = Array.from(container.childNodes)
      .filter(isMeaningfulNode)
      .map((node) => node.cloneNode(true));

    if (!source.length) return;

    container.replaceChildren();

    const caret = document.createElement('span');
    caret.className = 'typewriter-caret';
    caret.setAttribute('aria-hidden', 'true');
    container.appendChild(caret);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      for (const node of source) {
        container.insertBefore(node, caret);
      }
      container.classList.add('is-complete');
      return;
    }

    await delay(START_MS);
    await typeNodes(container, source, container, caret);
    container.classList.add('is-complete');
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.typewriter').forEach(init);
  });
})();
