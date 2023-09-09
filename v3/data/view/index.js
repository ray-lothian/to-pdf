/* global config */
'use strict';

const storage = prefs => new Promise(resolve => {
  chrome.storage.managed.get(prefs, ps => {
    chrome.storage.local.get(chrome.runtime.lastError ? prefs : ps || prefs, resolve);
  });
});

const search = new URLSearchParams(location.search);

document.documentElement.dataset.sim = search.get('sim');

const script = document.createElement('script');
script.src = chrome.runtime.getURL('/data/view/inject.js');
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
