/* globals config */
'use strict';

const storage = prefs => new Promise(resolve => {
  chrome.storage.managed.get(prefs, ps => {
    chrome.storage.local.get(chrome.runtime.lastError ? prefs : ps || prefs, resolve);
  });
});

const search = new URLSearchParams(location.search);

if (window.top !== window) {
  const script = Object.assign(document.createElement('script'), {
    textContent: `
      {
        const print = window.print;
        Object.defineProperty(window, 'print', {
          configurable: true,
          get() {
            return () => {
              if (${search.get('cm') === 'save-as-pdf-jspdf'}) {
                window.postMessage('convert-to-pdf', '*');
              }
              else {
                print();
                window.top.postMessage('release-button', '*');
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

  window.addEventListener('message', e => {
    if (e.data === 'convert-to-pdf') {
      chrome.runtime.sendMessage({
        method: 'convert-to-pdf'
      });
    }
  });
}
