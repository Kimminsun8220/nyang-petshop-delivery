/* Keep game strings and accessible names intact; replace only their visual icons. */
(() => {
  const sheets = [
    ['🐟','🫙','🧶','🪶','🪵','📦','🍪','🥣','🪀','🏰','🧺','🎒','📖','🎁','🏪','🏠'],
    ['🚐','🚗','🚧','🕳','🌙','🏁','💨','🐾','💥','⏰','⚠','✅','🗑','🔊','◀','▶']
  ];
  const icons = new Map();
  sheets.forEach((sheet, sheetIndex) => sheet.forEach((icon, index) => icons.set(icon, {sheet:sheetIndex,index})));
  icons.set('🛒', icons.get('🧺'));
  icons.set('✨', icons.get('💥'));
  const pattern = /\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*/gu;
  const skip = 'script,style,textarea,.ui-art,.cat-face,.van,.gate-cat,.logo-cat,.material-card:nth-child(6) .material-icon';
  function replaceText(node) {
    if (!node.parentElement || node.parentElement.closest(skip)) return;
    const text = node.nodeValue;
    const matches = [...text.matchAll(pattern)];
    if (!matches.length) return;
    const fragment = document.createDocumentFragment();
    let offset = 0;
    for (const match of matches) {
      fragment.append(document.createTextNode(text.slice(offset,match.index)));
      const icon = document.createElement('span');
      icon.className = 'ui-art';
      icon.textContent = match[0];
      const key = match[0].replace(/\uFE0F/g,'');
      const item = icons.get(key);
      if (item) {
        icon.classList.add(`ui-sheet-${item.sheet}`);
        icon.style.setProperty('--icon-x',`${(item.index % 4) * 100 / 3}%`);
        icon.style.setProperty('--icon-y',`${Math.floor(item.index / 4) * 100 / 3}%`);
      } else if (['😺','🐱','😿','😐','😾'].includes(key)) {
        icon.classList.add('ui-cat');
        icon.style.setProperty('--icon-y', ['😿','😐','😾'].includes(key) ? '100%' : '33.333333%');
      } else {
        icon.classList.add('ui-settlement');
      }
      fragment.append(icon);
      offset = match.index + match[0].length;
    }
    fragment.append(document.createTextNode(text.slice(offset)));
    node.replaceWith(fragment);
  }
  function decorate(root) {
    if (root.nodeType === Node.TEXT_NODE) { replaceText(root); return; }
    if (root.nodeType !== Node.ELEMENT_NODE || root.matches(skip)) return;
    const walker = document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[]; while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(replaceText);
  }
  const observer = new MutationObserver(records => {
    observer.disconnect();
    for (const record of records) {
      if (record.type === 'characterData') decorate(record.target);
      else record.addedNodes.forEach(decorate);
    }
    observe();
  });
  function observe() { observer.observe(document.body,{childList:true,subtree:true,characterData:true}); }
  decorate(document.body);
  observe();
})();
