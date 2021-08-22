/* globals config */
'use strict';

const storage = prefs => new Promise(resolve => {
  chrome.storage.managed.get(prefs, ps => {
    chrome.storage.local.get(chrome.runtime.lastError ? prefs : ps || prefs, resolve);
  });
});

const search = new URLSearchParams(location.search);

document.documentElement.dataset.sim = search.get('sim');

const script = Object.assign(document.createElement('script'), {
  textContent: `
    {
      const print = window.print;
      Object.defineProperty(window, 'print', {
        configurable: true,
        get() {
          return () => {
            if (${search.get('cm') !== 'save-as-pdf-jspdf'}) {
              print();
              window.top.postMessage({
                method: 'release-button',
                id: '${search.get('tpid')}'
              }, '*');
            }
          };
        }
      });
    }
  `
});
document.documentElement.appendChild(script);

if (search.get('cm') === 'save-as-pdf-jspdf') {
  storage({
    css: config.css
  }).then(prefs => {
    document.documentElement.appendChild(Object.assign(document.createElement('style'), {
      textContent: prefs.css
    }));
  });
}

if (search.get('cm') === 'save-as-pdf-jspdf') {
  chrome.runtime.sendMessage({
    method: 'convert-to-pdf'
  });
}
