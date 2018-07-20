'use strict';

function onClicked(e) {
  const span = e.target;
  const cmd = span.dataset.cmd;
  if (cmd && cmd.startsWith('save-as-pdf-')) {
    span.dataset.working = true;
    if (window.iframe) {
      window.iframe.remove();
    }
    let [search, th, additional] = document.location.hash.substr(1).split('/');
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

    window.iframe = Object.assign(document.createElement('iframe'), {
      width: 300,
      height: 300,
      style: 'position: absolute; left: 0; top: 0; background-color: #fff; visibility: hidden; pointer-events: none;',
      src: '//mail.google.com/mail/u/0/?ui=2&view=pt&search=' + search + '&th=' + th + '&cm=' + cmd
    });
    document.body.appendChild(window.iframe);
  }
}

function insert() {
  try {
    document.getElementById('jspdf-print').remove();
    document.getElementById('jspdf-pdf').remove();
  }
  catch (e) {}

  chrome.storage.local.get({
    'simple-mode': true,
    'print-mode': true
  }, prefs => {
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
  });
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
  if (e.data === 'close-me') {
    close();
  }
  else if (e.data === 'release-button') {
    document.querySelector('[data-cmd=save-as-pdf-print]').dataset.working = false;
  }
});
