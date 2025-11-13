'use strict';

const storage = prefs => new Promise(resolve => {
  chrome.storage.managed.get(prefs, ps => {
    chrome.storage.local.get(chrome.runtime.lastError ? prefs : ps || prefs, resolve);
  });
});

// eslint-disable-next-line no-unused-vars
async function onClicked(e) {
  try {

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
      const legacy = Array.from(root.querySelectorAll('[data-legacy-thread-id]')).filter(e => e.offsetHeight).at(-1);
      const perm = Array.from(root.querySelectorAll('[data-thread-perm-id]')).filter(e => e.offsetHeight).at(-1);

      const {debug, images, width, height} = await storage({
        debug: false,
        images: false,
        width: 612,
        height: 792
      });
      const id = 'to-pdf' + Math.random();
      if (perm || legacy) {
        let src;
        if (perm && perm.dataset.threadPermId && perm.dataset.threadPermId !== 'undefined') {
          src = '//mail.google.com/mail/u/' + num + '/?view=pt&search=all&permthid='+
            encodeURIComponent(perm.dataset.threadPermId);
        }
        else if (legacy && legacy.dataset.legacyThreadId && legacy.dataset.legacyThreadId !== 'undefined') {
          src = '//mail.google.com/mail/u/' + num + '/?ui=2&view=pt&search=all&th=' +
            encodeURIComponent(legacy.dataset.legacyThreadId);
        }
        console.log(perm, legacy);

        if (!src) {
          throw Error('CANNOT_DETECT_THREAD');
        }

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
        const r = await fetch(src);
        if (r.ok) {
          next(src);
        }
        else {
          const r = await fetch(src + '&mb=1');
          if (r.ok) {
            next(src + '&mb=1');
          }
          else {
            throw Error('PRINT_SRC_ERROR_' + r.status);
          }
        }
      }
      else {
        throw Error('Cannot find the thread id! Please report this');
      }
    }
  }
  catch (e) {
    console.error(e);
    alert('[error] ' + e.message);
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
