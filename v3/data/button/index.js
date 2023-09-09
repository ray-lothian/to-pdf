'use strict';

const storage = prefs => new Promise(resolve => {
  chrome.storage.managed.get(prefs, ps => {
    chrome.storage.local.get(chrome.runtime.lastError ? prefs : ps || prefs, resolve);
  });
});

// eslint-disable-next-line no-unused-vars
async function onClicked(e) {
  const span = e.target;
  const cmd = span.dataset.cmd;
  if (cmd && cmd.startsWith('save-as-pdf-')) {
    span.dataset.working = true;

    // account id
    let num = /\d+/.exec(location.pathname);
    if (num && num.length) {
      num = num[0];
    }
    else {
      num = 0;
    }
    // try to find the thread id in the new UI
    const root = e.target.closest('.aia') || e.target.closest('.bkK') || document.body;
    const legacy = root.querySelector('[data-legacy-thread-id]');
    const perm = root.querySelector('[data-thread-perm-id]');

    const {debug, images, width, height} = await storage({
      debug: false,
      images: false,
      width: 612,
      height: 792
    });
    const id = 'to-pdf' + Math.random();
    if (perm || legacy) {
      const src = perm ?
        '//mail.google.com/mail/u/' + num + '/?view=pt&search=all&permthid=' + encodeURIComponent(perm.dataset.threadPermId) :
        '//mail.google.com/mail/u/' + num + '/?ui=2&view=pt&search=all&th=' + encodeURIComponent(legacy.dataset.legacyThreadId);

      const next = src => {
        const iframe = Object.assign(document.createElement('iframe'), {
          id,
          width,
          height,
          style: `
            position: absolute;
            z-index: 10;
            left: 0;
            top: 0;
            background-color: #fff;
            visibility: ${debug ? 'visible' : 'hidden'};
            pointer-events: ${debug ? 'inherit' : 'none'};
          `,
          src: src + '&cm=' + cmd + '&sim=' + images + '&tpid=' + id
        });
        document.body.appendChild(iframe);
      };
      fetch(src).then(r => {
        if (r.ok) {
          next(src);
        }
        else {
          next(src + '&mb=1');
        }
      });
    }
    else {
      alert('Cannot find the thread id! Please report this');
    }
  }
}

addEventListener('message', e => {
  if (e.data && e.data.method === 'release-button') {
    const b = document.querySelector('[data-cmd=save-as-pdf-print]');
    if (b) {
      b.dataset.working = false;
    }
    chrome.runtime.sendMessage({
      method: 'close-me',
      id: e.data.id
    });
  }
});
