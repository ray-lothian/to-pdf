'use strict';

function insert() {
  const parent = document.querySelector('.ade');
  if (parent) {
    const img = Object.assign(document.createElement('img'), {
      src: chrome.runtime.getURL('/data/button/icon-blue.svg')
    });
    const print = Object.assign(document.createElement('span'), {
      title: 'Save as PDF (print)'
    });
    print.classList.add('hk', 'J-J5-Ji');
    print.appendChild(img);
    print.dataset.cmd = 'save-as-pdf-print';
    parent.insertBefore(print, parent.firstChild);
    const pdf = Object.assign(print.cloneNode(true), {
      title: 'Save as PDF (simple)'
    });
    pdf.dataset.cmd = 'save-as-pdf-jspdf';
    pdf.querySelector('img').src = chrome.runtime.getURL('/data/button/icon-orange.svg');
    parent.insertBefore(pdf, parent.firstChild);

    parent.addEventListener('click', e => {
      const span = e.target;
      const cmd = span.dataset.cmd;
      if (cmd && cmd.startsWith('save-as-pdf-')) {
        span.dataset.working = true;
        if (window.iframe) {
          window.iframe.remove();
        }
        const [search, th] = document.location.hash.substr(1).split('/');
        window.iframe = Object.assign(document.createElement('iframe'), {
          width: 300,
          height: 300,
          style: 'position: absolute; left: 0; top: 0; background-color: #fff; visibility: hidden; pointer-events: none;',
          src: '//mail.google.com/mail/u/0/?ui=2&view=pt&search=' + search + '&th=' + th + '&cm=' + cmd
        });
        document.body.appendChild(window.iframe);
      }
    });
  }
}

window.addEventListener('hashchange', insert);

if (window.location.hash.split('/').length > 1) {
  window.addEventListener('load', () => {
    const observer = new MutationObserver(() => {
      if (document.querySelector('.ade')) {
        observer.disconnect();
        insert();
      }
    });
    observer.observe(document.body, {childList: true});
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
