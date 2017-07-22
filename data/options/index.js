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
});

function save() {
  const standard = document.querySelector('[value=standard]').checked;
  const select = document.querySelector('select');
  chrome.storage.local.set({
    size: standard ? select.value : 'page',
    width: parseFloat(select.selectedOptions[0].dataset.width),
    height: parseFloat(select.selectedOptions[0].dataset.height),
    images: document.getElementById('images').checked,
    css: document.getElementById('css').value,
  }, () => {
    const status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(() => status.textContent = '', 750);
  });
}

document.getElementById('save').addEventListener('click', save);
