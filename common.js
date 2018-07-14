'use strict';

chrome.runtime.onMessage.addListener((request, sender, response) => {
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
    const filename = sender.tab.title
      .replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>{}[\]\\/]/gi, '_') + '.pdf';
    fetch(request.url)
      .then(res => res.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        chrome.downloads.download({
          filename,
          url
        }, () => {
          window.setTimeout(() => {
            URL.revokeObjectURL(url);
            chrome.tabs.executeScript(tabId, {
              runAt: 'document_start',
              allFrames: false,
              code: `
                try {
                  window.iframe.remove();
                }
                catch (e) {}
                delete window.iframe;
                document.querySelector('[data-cmd=${request.cmd}]').dataset.working = false;
              `
            });
          });
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
chrome.storage.local.get({
  'version': null,
  'faqs': true,
  'last-update': 0
}, prefs => {
  const version = chrome.runtime.getManifest().version;

  if (prefs.version ? (prefs.faqs && prefs.version !== version) : true) {
    const now = Date.now();
    const doUpdate = (now - prefs['last-update']) / 1000 / 60 / 60 / 24 > 30;
    chrome.storage.local.set({
      version,
      'last-update': doUpdate ? Date.now() : prefs['last-update']
    }, () => {
      // do not display the FAQs page if last-update occurred less than 30 days ago.
      if (doUpdate) {
        const p = Boolean(prefs.version);
        chrome.tabs.create({
          url: chrome.runtime.getManifest().homepage_url + '&version=' + version +
            '&type=' + (p ? ('upgrade&p=' + prefs.version) : 'install'),
          active: p === false
        });
      }
    });
  }
});

{
  const {name, version} = chrome.runtime.getManifest();
  chrome.runtime.setUninstallURL(
    chrome.runtime.getManifest().homepage_url + '&rd=feedback&name=' + name + '&version=' + version
  );
}
