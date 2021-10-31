(async () => {
  const storage = prefs => new Promise(resolve => {
    chrome.storage.managed.get(prefs, ps => {
      chrome.storage.local.get(chrome.runtime.lastError ? prefs : ps || prefs, resolve);
    });
  });

  const cmd = document.querySelector('[data-cmd=save-as-pdf-jspdf]');
  const threads = [...document.querySelectorAll('[role="main"] tr.x7')]
    .map(tr => tr.querySelector('[data-thread-id]').dataset.threadId.substr(1));

  if (threads.length) {
    if (window.busy) {
      return alert('There is an ongoing conversion. Please retry later.');
    }
    window.busy = true;
    let num = /\d+/.exec(location.pathname);
    if (num && num.length) {
      num = num[0];
    }
    else {
      num = 0;
    }
    const {debug, images, width, height} = await storage({
      debug: false,
      images: false,
      width: 612,
      height: 792
    });
    let n = 0;
    for (const thread of threads) {
      n += 1;
      chrome.runtime.sendMessage({
        method: 'badge',
        current: n,
        total: threads.length
      });

      await new Promise(resolve => {
        const id = 'to-pdf' + Math.random();
        const src = `https://mail.google.com/mail/u/${num}/?view=pt&search=all` +
          '&permthid=' + encodeURIComponent(thread) +
          '&cm=save-as-pdf-jspdf' + '&sim=' + images +
          '&tpid=' + id;

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
            `
          });
          iframe.src = src;
          document.body.appendChild(iframe);
          setTimeout(resolve, 1000);
        };

        // https://github.com/ray-lothian/to-pdf/issues/8
        fetch(src).then(r => {
          if (r.ok) {
            next(src);
          }
          else {
            next(src + '&mb=1');
          }
        });
      });
    }
    chrome.runtime.sendMessage({
      method: 'badge'
    });
    window.busy = false;
  }
  else if (cmd) {
    cmd.click();
  }
  else {
    alert('Please select a few threads and retry.');
  }
})();

