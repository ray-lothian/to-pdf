/* globals config */
'use strict';

document.querySelector('select').addEventListener('change', () => {
  document.querySelector('[value=standard]').checked = true;
});

chrome.storage.local.get(config, prefs => {
  if (prefs.size === 'page') {
    document.querySelector('[value=page]').checked = true;
  }
  else {
    document.querySelector('[value=standard]').checked = true;
    document.querySelector('select').value = prefs.size;
  }
  document.getElementById('images').checked = prefs.images;
  document.getElementById('css').value = prefs.css;
  document.getElementById('simple-mode').checked = prefs['simple-mode'];
  document.getElementById('print-mode').checked = prefs['print-mode'];
  document.getElementById('saveAs').checked = prefs.saveAs;
  document.getElementById('format').value = prefs.format;
});

function save() {
  const standard = document.querySelector('[value=standard]').checked;
  const select = document.querySelector('select');
  chrome.storage.local.set({
    'size': standard ? select.value : 'page',
    'width': parseFloat(select.selectedOptions[0].dataset.width),
    'height': parseFloat(select.selectedOptions[0].dataset.height),
    'images': document.getElementById('images').checked,
    'css': document.getElementById('css').value,
    'simple-mode': document.getElementById('simple-mode').checked,
    'print-mode': document.getElementById('print-mode').checked,
    'saveAs': document.getElementById('saveAs').checked,
    'format': document.getElementById('format').value
  }, () => {
    const status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(() => status.textContent = '', 750);
  });
}

document.getElementById('save').addEventListener('click', save);
