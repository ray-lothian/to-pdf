/* globals config */
'use strict';

const search = document.location.search.substr(1)
  .split('&').map(s => {
    const [key, value] = s.split('=');
    return [key, value];
  }).reduce((p, c) => Object.assign(p, {[c[0]]: decodeURIComponent(c[1])}), {});

if (window.top !== window) {
  const script = Object.assign(document.createElement('script'), {
    textContent: `
      {
        const print = window.print;
        Object.defineProperty(window, 'print', {
          configurable: true,
          get() {
            return () => {
              if (${search.cm === 'save-as-pdf-jspdf'}) {
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
  if (search.cm === 'save-as-pdf-jspdf') {
    chrome.storage.local.get({
      css: config.css
    }, prefs => {
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
