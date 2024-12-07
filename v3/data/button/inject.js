/* global storage, onClicked */
{
  const locate = {
    parent() {
      // find print's svg
      return document.querySelector('path[d^=M648-624V-], path[d^=M648-624v-]')?.closest('div');
    }
  };

  const insert = async () => {
    console.log('inserting');

    if (insert.busy) {
      return;
    }

    insert.busy = true;
    document.getElementById('jspdf-print')?.remove();
    document.getElementById('jspdf-pdf')?.remove();
    document.getElementById('jspdf-parent')?.remove();

    const parent = locate.parent();

    if (parent) {
      const prefs = await storage({
        'simple-mode': true,
        'print-mode': true
      });

      const div = document.createElement('div');
      div.id = 'jspdf-parent';
      div.style = `
        display: flex;
        gap: 1px;
        order: 2;
        margin-block: 5px;
        margin-left: 10px;
      `;
      parent.parentElement.parentElement.appendChild(div);

      if (prefs['print-mode']) {
        const img = Object.assign(document.createElement('img'), {
          src: chrome.runtime.getURL('/data/button/icon-blue.svg')
        });
        const print = Object.assign(document.createElement('span'), {
          title: 'Save as PDF (print)',
          id: 'jspdf-print'
        });
        print.appendChild(img);
        print.dataset.cmd = 'save-as-pdf-print';
        print.addEventListener('click', onClicked);
        div.appendChild(print);
      }
      if (prefs['simple-mode']) {
        const img = Object.assign(document.createElement('img'), {
          src: chrome.runtime.getURL('/data/button/icon-orange.svg')
        });
        const pdf = Object.assign(document.createElement('span'), {
          title: 'Save as PDF (simple)',
          id: 'jspdf-pdf'
        });
        pdf.appendChild(img);
        pdf.dataset.cmd = 'save-as-pdf-jspdf';
        pdf.addEventListener('click', onClicked);
        div.appendChild(pdf);
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
