/* Presentation only: keep game strings and accessible names unchanged. */
(() => {
  const sheets = [
    ['🐟','🫙','🧶','🪶','🪵','📦','🍪','🥣','🪀','🏰','🧺','🎒','📖','🎁','🏪','🏠'],
    ['🚐','🚗','🚧','🕳','🌙','🏁','💨','🐾','💥','⏰','⚠','✅','🗑','cat-head','◀','▶']
  ];
  const icons = new Map();
  // Measured source rectangles in the 1254px sheets. Isolate each drawing,
  // rather than assuming the generated artwork obeys equal grid boundaries.
  const crops = [
    [[48,110,263,185],[378,78,210,230],[674,94,265,218],[1006,75,194,254],
     [48,389,280,205],[368,368,232,230],[658,395,254,181],[960,397,251,187],
     [56,649,262,236],[363,637,218,264],[632,649,287,242],[963,634,253,277],
     [48,969,280,201],[362,932,245,259],[635,946,284,235],[950,939,265,244]],
    [[48,125,260,193],[357,126,250,197],[667,92,220,242],[934,200,271,112],
     [77,380,215,235],[363,369,244,246],[676,409,234,195],[968,396,240,215],
     [60,655,243,247],[358,655,254,253],[670,674,251,213],[983,685,244,212],
     [79,941,210,248],[363,960,266,231],[684,990,226,192],[966,995,223,183]]
  ];
  sheets.forEach((sheet, sheetIndex) => sheet.forEach((icon, index) => icons.set(icon, {sheet:sheetIndex,index})));
  icons.set('🛒', icons.get('🧺'));
  icons.set('✨', icons.get('💥'));
  const pattern = /\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*/gu;
  const skip = 'script,style,textarea,.ui-art,.cat-face,.van,.gate-cat,.logo-cat';
  function replaceText(node) {
    if (!node.parentElement || node.parentElement.closest(skip)) return;
    const text = node.nodeValue;
    const matches = [...text.matchAll(pattern)];
    if (!matches.length) return;
    const fragment = document.createDocumentFragment();
    let offset = 0;
    for (const match of matches) {
      fragment.append(document.createTextNode(text.slice(offset,match.index)));
      const key = match[0].replace(/\uFE0F/g,'');
      offset = match.index + match[0].length;
      // Sound controls intentionally use the familiar native speaker emoji.
      if (['🔊','🔇','🔈','🔉'].includes(key)) {
        fragment.append(document.createTextNode(match[0]));
        continue;
      }
      const icon = document.createElement('span');
      icon.className = 'ui-art';
      icon.textContent = match[0];
      const isBrand = !!node.parentElement.closest('.brand-icon');
      const item = icons.get(isBrand ? 'cat-head' : key);
      if (item) {
        icon.classList.add('ui-atlas',`ui-sheet-${item.sheet}`);
        icon.style.setProperty('--icon-x',`${(item.index % 4) * 100 / 3}%`);
        icon.style.setProperty('--icon-y',`${Math.floor(item.index / 4) * 100 / 3}%`);
        const [x,y,w,h] = crops[item.sheet][item.index];
        const scale = 90 / Math.max(w,h);
        icon.style.setProperty('--crop-w',`${w * scale}%`);
        icon.style.setProperty('--crop-h',`${h * scale}%`);
        icon.style.setProperty('--crop-left',`${(100-w*scale)/2}%`);
        icon.style.setProperty('--crop-top',`${(100-h*scale)/2}%`);
        icon.style.setProperty('--crop-size',`${1254/w*100}% ${1254/h*100}%`);
        icon.style.setProperty('--crop-position',`${x/(1254-w)*100}% ${y/(1254-h)*100}%`);
        if (key === '🐾') icon.classList.add('ui-paw');
        if (isBrand) icon.classList.add('ui-head');
      } else if (['😺','🐱','😿','😐','😾'].includes(key)) {
        icon.classList.add('ui-cat');
        icon.style.setProperty('--icon-y', ['😿','😐','😾'].includes(key) ? '100%' : '33.333333%');
      } else {
        icon.classList.add('ui-settlement');
      }
      fragment.append(icon);
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
