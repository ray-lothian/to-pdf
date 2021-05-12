'use strict';

const storage = prefs => new Promise(resolve => {
  chrome.storage.managed.get(prefs, ps => {
    chrome.storage.local.get(chrome.runtime.lastError ? prefs : ps || prefs, resolve);
  });
});

async function onClicked(e) {
  const span = e.target;
  const cmd = span.dataset.cmd;
  if (cmd && cmd.startsWith('save-as-pdf-')) {
    span.dataset.working = true;

    let [search, th, additional] = document.location.hash.substr(1).split('/');
    let num = /\d+/.exec(location.pathname);
    if (num && num.length) {
      num = num[0];
    }
    else {
      num = 0;
    }
    // try to find the thread id in the new UI
    const root = e.target.closest('.bkK');
    if (root) {
      const legacy = root.querySelector('[data-legacy-thread-id].hP');
      if (legacy) {
        th = legacy.dataset.legacyThreadId || th;
      }
    }
    if (additional) {
      search = 'all';
    }
    const {debug, images, width, height} = await storage({
      debug: false,
      images: false,
      width: 612,
      height: 792
    });
    const id = 'to-pdf' + Math.random();
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
      src: '//mail.google.com/mail/u/' + num + '/?ui=2&view=pt&search=' + search + '&th=' + th + '&cm=' + cmd + '&sim=' + images + '&tpid=' + id
    });
    document.body.appendChild(iframe);
  }
}

async function insert() {
  try {
    document.getElementById('jspdf-print').remove();
    document.getElementById('jspdf-pdf').remove();
  }
  catch (e) {}

  const prefs = await storage({
    'simple-mode': true,
    'print-mode': true
  });

  const parent = document.querySelector('.ade');
  if (parent) {
    if (prefs['print-mode']) {
      const img = Object.assign(document.createElement('img'), {
        src: chrome.runtime.getURL('/data/button/icon-blue.svg')
      });
      const print = Object.assign(document.createElement('span'), {
        title: 'Save as PDF (print)',
        id: 'jspdf-print'
      });
      print.classList.add('hk', 'J-J5-Ji');
      print.appendChild(img);
      print.dataset.cmd = 'save-as-pdf-print';
      print.addEventListener('click', onClicked);
      parent.insertBefore(print, parent.firstChild);
    }
    if (prefs['simple-mode']) {
      const img = Object.assign(document.createElement('img'), {
        src: chrome.runtime.getURL('/data/button/icon-orange.svg')
      });
      const pdf = Object.assign(document.createElement('span'), {
        title: 'Save as PDF (simple)',
        id: 'jspdf-pdf'
      });
      pdf.classList.add('hk', 'J-J5-Ji');
      pdf.appendChild(img);
      pdf.dataset.cmd = 'save-as-pdf-jspdf';
      pdf.addEventListener('click', onClicked);
      parent.insertBefore(pdf, parent.firstChild);
    }
  }
}

window.addEventListener('hashchange', insert);

if (window.location.hash.split('/').length > 1) {
  window.addEventListener('load', () => {
    if (document.querySelector('.ade')) {
      insert();
    }
    else {
      const observer = new MutationObserver(() => {
        if (document.querySelector('.ade')) {
          observer.disconnect();
          insert();
        }
      });

      observer.observe(document.body, {childList: true});
    }
  });
}

window.addEventListener('message', e => {
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
