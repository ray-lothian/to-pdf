'use strict';

const storage = prefs => new Promise(resolve => {
  chrome.storage.managed.get(prefs, ps => {
    chrome.storage.local.get(chrome.runtime.lastError ? prefs : ps || prefs, resolve);
  });
});

chrome.runtime.onMessage.addListener(async (request, sender, response) => {
  const tabId = sender.tab.id;
  if (request.method === 'image-to-data') {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      ctx.webkitImageSmoothingEnabled = true;
      ctx.mozImageSmoothingEnabled = true;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0);
      response(canvas.toDataURL('image/png', 1.0));
    };
    img.onerror = () => response();
    img.src = request.src;

    return true;
  }
  else if (request.method === 'convert-to-pdf') {
    chrome.tabs.executeScript(tabId, {
      runAt: 'document_start',
      allFrames: false,
      file: '/data/print/jspdf.min.js',
      frameId: sender.frameId
    }, () => {
      chrome.tabs.executeScript(tabId, {
        runAt: 'document_start',
        allFrames: false,
        file: '/data/print/print.js',
        frameId: sender.frameId
      });
    });
  }
  else if (request.method === 'download') {
    const prefs = await storage({
      format: '[title] - [date] [time]',
      saveAs: false,
      debug: false
    });
    const time = new Date();
    const gmt = (new Date(time - time.getTimezoneOffset() * 60000))
      .toISOString().slice(2, 10).replace(/[^0-9]/g, '');

    const filename = prefs.format
      .replace('[title]', request.title)
      .replace('[simple-title]', request.title.replace(/\s-\s[^\s]+@.*$/, ''))
      .replace('[date]', time.toLocaleDateString().replace(/[:/]/g, '.'))
      .replace('[time]', time.toLocaleTimeString().replace(/[:/]/g, '.'))
      .replace('[gmt]', gmt)
      .replace(/[`~!@#$%^&*()_|+=?;:'",<>{}[\]\\/]/gi, '_')
      .replace('.pdf', '') + '.pdf';

    const next = () => {
      chrome.tabs.executeScript(tabId, {
        runAt: 'document_start',
        allFrames: false,
        code: `
          if (${prefs.debug} === false) {
            try {
              window.iframe.remove();
            }
            catch (e) {}
          }
          delete window.iframe;
          document.querySelector('[data-cmd=${request.cmd}]').dataset.working = false;
        `
      });
    };
    fetch(request.url)
      .then(res => res.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        chrome.downloads.download({
          filename,
          url,
          saveAs: prefs.saveAs
        }, () => {
          next();
          window.setTimeout(() => URL.revokeObjectURL(url), 10000);
        });
      });

    return false;
  }
});
/*
chrome.browserAction.onClicked.addListener(tab => {
  chrome.tabs.executeScript(tab.id, {
    runAt: 'document_start',
    allFrames: false,
    file: '/data/print/jspdf.min.js'
  }, () => {
    chrome.tabs.executeScript(tab.id, {
      runAt: 'document_start',
      allFrames: false,
      file: '/data/print/print.js'
    });
  });
});
*/

// FAQs & Feedback
{
  const {onInstalled, setUninstallURL, getManifest} = chrome.runtime;
  const {name, version} = getManifest();
  const page = getManifest().homepage_url;
  onInstalled.addListener(({reason, previousVersion}) => {
    storage({
      'faqs': true,
      'last-update': 0
    }).then(prefs => {
      if (reason === 'install' || (prefs.faqs && reason === 'update')) {
        const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
        if (doUpdate && previousVersion !== version) {
          chrome.tabs.create({
            url: page + '?version=' + version +
              (previousVersion ? '&p=' + previousVersion : '') +
              '&type=' + reason,
            active: reason === 'install'
          });
          chrome.storage.local.set({'last-update': Date.now()});
        }
      }
    });
  });
  setUninstallURL(page + '?rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
}
