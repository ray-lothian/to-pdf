'use strict';

const storage = prefs => new Promise(resolve => {
  chrome.storage.managed.get(prefs, ps => {
    chrome.storage.local.get(chrome.runtime.lastError ? prefs : ps || prefs, resolve);
  });
});

chrome.runtime.onMessage.addListener((request, sender, response) => {
  const tabId = sender.tab.id;
  if (request.method === 'bg-image') {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 30000);
    fetch(request.src, {
      signal: controller.signal
    }).then(r => {
      if (r.ok) {
        return r.blob().then(blob => new Promise(resolve => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        }));
      }
      else {
        throw Error('abort');
      }
    }).then(response, () => response(''));
    return true;
  }
  else if (request.method === 'download-pdf') {
    chrome.downloads.download({
      filename: request.filename,
      url: request.url,
      saveAs: false
    }, () => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        chrome.downloads.download({
          filename: 'email.pdf',
          url: request.url,
          saveAs: false
        });
      }
    });
    return false;
  }
  else if (request.method === 'release-button') {
    chrome.scripting.executeScript({
      target: {
        tabId
      },
      func: (debug, id, cmd) => {
        if (debug === false) {
          document.getElementById(id)?.remove();
        }
        const e = document.querySelector(`[data-cmd=${cmd}]`);
        if (e) {
          e.dataset.working = false;
        }
      },
      args: [request.debug, request.id, request.cmd]
    });
  }
  else if (request.method === 'convert-to-pdf') {
    const target = {
      tabId,
      frameIds: [sender.frameId]
    };

    chrome.scripting.executeScript({
      target,
      func: tabId => {
        window.tabId = tabId;
      }
    }).then(() => chrome.scripting.executeScript({
      target,
      files: ['/data/print/jspdf.umd.min.js']
    })).then(() => {
      chrome.scripting.executeScript({
        target,
        files: ['/data/print/print.js']
      });
    });
  }
  else if (request.method === 'close-me') {
    storage({
      debug: false
    }).then(prefs => {
      chrome.scripting.executeScript({
        target: {
          tabId
        },
        func: (debug, id) => {
          if (debug === false) {
            document.getElementById(id)?.remove();
          }
        },
        args: [prefs.debug, request.id]
      });
    });
  }
  else if (request.method === 'badge') {
    if (request.current) {
      chrome.action.setBadgeText({
        tabId: sender.tab.id,
        text: `${request.current}/${request.total}`
      });
    }
    else {
      chrome.action.setBadgeText({
        tabId: sender.tab.id,
        text: ''
      });
    }
  }
});

chrome.action.onClicked.addListener(async tab => {
  try {
    await chrome.scripting.executeScript({
      target: {
        tabId: tab.id
      },
      files: ['/data/threads.js']
    });
  }
  catch (e) {
    chrome.tabs.create({
      index: tab.index + 1,
      url: 'https://mail.google.com/mail/u/0/#inbox'
    });
  }
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
