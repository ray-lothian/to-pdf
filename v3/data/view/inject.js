window.print = new Proxy(window.print, {
  apply(target, self, args) {
    const search = new URLSearchParams(location.search);

    if (search.get('cm') !== 'save-as-pdf-jspdf') {
      top.postMessage({
        method: 'release-button',
        id: search.get('tpid')
      }, '*');

      return Reflect.apply(target, self, args);
    }
  }
});
