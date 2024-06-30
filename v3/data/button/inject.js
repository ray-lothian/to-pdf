/* global storage, onClicked */
{
  const locate = {
    parent() {
      // find print's svg
      return document.querySelector('path[d^=M648-624V-], path[d^=M648-624v-]')?.closest('div');
    }
  };

  const insert = async () => {
    if (insert.busy) {
      return;
    }

    insert.busy = true;
    try {
      document.getElementById('jspdf-print').remove();
      document.getElementById('jspdf-pdf').remove();
    }
    catch (e) {}

    const parent = locate.parent();

    if (parent) {
      const prefs = await storage({
        'simple-mode': true,
        'print-mode': true
      });

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
    insert.busy = false;
  };

  // run
  const b = document.getElementById('jspdf-print');
  if (!b || b.offsetHeight === 0) {
    insert();
  }
}
