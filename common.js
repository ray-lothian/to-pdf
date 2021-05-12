'use strict';

const storage = prefs => new Promise(resolve => {
  chrome.storage.managed.get(prefs, ps => {
    chrome.storage.local.get(chrome.runtime.lastError ? prefs : ps || prefs, resolve);
  });
});

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
      const r = canvas.toDataURL('image/png', 1.0);
      response(r);
    };
    img.onerror = () => response();
    img.src = request.src;

    return true;
  }
  else if (request.method === 'convert-to-pdf') {
    chrome.tabs.executeScript(tabId, {
      runAt: 'document_start',
      allFrames: false,
      file: '/data/print/jspdf.umd.min.js',
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
    storage({
      format: '[title] - [date] [time]',
      saveAs: false,
      debug: false
    }).then(prefs => {
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
              const e = document.getElementById('${request.id}');
              if (e) {
                e.remove();
              }
            }
            {
              const e =document.querySelector('[data-cmd=${request.cmd}]');
              if (e) {
                e.dataset.working = false;
              }
            }
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
    });

    return false;
  }
  else if (request.method === 'close-me') {
    storage({
      format: '[title] - [date] [time]',
      saveAs: false,
      debug: false
    }).then(prefs => {
      chrome.tabs.executeScript(tabId, {
        runAt: 'document_start',
        allFrames: false,
        code: `
          if (${prefs.debug} === false) {
            const e = document.getElementById('${request.id}');
            if (e) {
              e.remove();
            }
          }
        `
      });
    });
  }
  else if (request.method === 'badge') {
    if (request.current) {
      chrome.browserAction.setBadgeText({
        tabId: sender.tab.id,
        text: `${request.current}/${request.total}`
      });
    }
    else {
      chrome.browserAction.setBadgeText({
        tabId: sender.tab.id,
        text: ''
      });
    }
  }
});

chrome.browserAction.onClicked.addListener(tab => {
  chrome.tabs.executeScript({
    runAt: 'document_start',
    allFrames: false,
    file: '/data/threads.js'
  }, () => {
    const lastError = chrome.runtime.lastError;
    if (lastError) {
      chrome.tabs.create({
        index: tab.index + 1,
        url: 'https://mail.google.com/mail/u/0/#inbox'
      });
    }
  });
});


/* FAQs & Feedback */
{
  const {management, runtime: {onInstalled, setUninstallURL, getManifest}, storage, tabs} = chrome;
  if (navigator.webdriver !== true) {
    const page = getManifest().homepage_url;
    const {name, version} = getManifest();
    onInstalled.addListener(({reason, previousVersion}) => {
      management.getSelf(({installType}) => installType === 'normal' && storage.local.get({
        'faqs': true,
        'last-update': 0
      }, prefs => {
        if (reason === 'install' || (prefs.faqs && reason === 'update')) {
          const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
          if (doUpdate && previousVersion !== version) {
            tabs.query({active: true, currentWindow: true}, tbs => tabs.create({
              url: page + '?version=' + version + (previousVersion ? '&p=' + previousVersion : '') + '&type=' + reason,
              active: reason === 'install',
              ...(tbs && tbs.length && {index: tbs[0].index + 1})
            }));
            storage.local.set({'last-update': Date.now()});
          }
        }
      }));
    });
    setUninstallURL(page + '?rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
  }
}
