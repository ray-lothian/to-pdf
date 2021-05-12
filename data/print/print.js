/* globals jspdf, search, config, storage */
'use strict';

const Font = function() {
  this.canvas = Object.assign(document.createElement('canvas'), {
    width: 500,
    height: 128,
    style: 'position: absolute; top: 0; visibility: hidden;'
  });
  document.body.appendChild(this.canvas);
  this.ctx = this.canvas.getContext('2d');
};
// list of supported fonts
Font.prototype.supported = ['arial', 'serif', 'times new roman', 'monospace', 'tahoma'];
// list of fonts with only normal.ttf
Font.prototype.normal = ['monospace', 'serif', 'tahoma'];
Font.prototype.split = function(fonts) {
  return fonts.replace(';', '').split(/\s*,\s*/)
    .map(f => f.replace(/['"]/g, '').toLowerCase());
};
Font.prototype.join = function(fonts) {
  return fonts.map(f => /\s/.test(f) ? `"${f}"` : f).join(',');
};
Font.prototype.key = function(str, fonts) {
  // clear the canvas
  this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  // draw new text
  this.ctx.font = '128px ' + fonts;
  this.ctx.fillText(str, 0, 128);
  return this.canvas.toDataURL();
};
Font.prototype.detect = function(str, fonts) {
  const ref = this.key(str, fonts);
  for (const font of this.split(fonts)) {
    if (this.supported.indexOf(font) !== -1 && this.key(str, font) === ref) {
      return font;
    }
  }
  return 'arial';
};
Font.prototype.destory = function() {
  document.body.removeChild(this.canvas);
};

const Node = function(node) {
  this.node = node;
  this.nodeType = node.nodeType;
  this.noChild = Boolean(node.firstChild) === false;

  this.TEXT_NODE = node.TEXT_NODE;
  this.ELEMENT_NODE = node.ELEMENT_NODE;
  this.firstChild = node.firstChild;
  this.nextSibling = node.nextSibling;

  this.parent = this.getParent(node);

  if (this.nodeType === node.TEXT_NODE) {
    this.range = document.createRange();
    this.range.selectNode(node);
    this.rect = this.range.getBoundingClientRect();
    this.rects = this.range.getClientRects();
  }
  if (this.nodeType === node.ELEMENT_NODE) {
    this.rect = node.getBoundingClientRect();
    this.rects = node.getClientRects();
  }

  Object.defineProperty(this, 'styles', {
    get() {
      const styles = window.getComputedStyle(this.parent, null);
      return Object.assign({}, styles, {
        'border-top-width': parseInt(styles['border-top-width']),
        'border-bottom-width': parseInt(styles['border-bottom-width']),
        'border-left-width': parseInt(styles['border-left-width']),
        'border-right-width': parseInt(styles['border-right-width']),

        'font-size': parseInt(styles['font-size']),
        'font-family': this.parent.dataset.font,
        'font-style': this.parent.dataset.style,
        'font-weight': styles['font-weight'],

        'color': this.color(styles.color),

        'border-top-color': this.color(styles['border-top-color']),
        'border-bottom-color': this.color(styles['border-bottom-color']),
        'border-left-color': this.color(styles['border-left-color']),
        'border-right-color': this.color(styles['border-right-color'])
      });
    }
  });

  function isBoundary(node) {
    return Boolean(node) &&
      (node.nodeType === node.ELEMENT_NODE || node.nodeType === node.TEXT_NODE) &&
      node.tagName !== 'BR';
  }
  const value = (node.nodeValue || node.value || node.textContent)
    .replace(/^\s+/, isBoundary(node.previousSibling) ? ' ' : '')
    .replace(/\s+$/, isBoundary(node.nextSibling) ? ' ' : '');
  this.value = value;
};
Node.prototype.getParent = function(node) {
  while (node.nodeType !== node.ELEMENT_NODE) {
    node = node.parentNode;
  }
  return node;
};
Node.prototype.color = function(rgb) {
  const color = /(\d+), (\d+), (\d+)/.exec(rgb);
  return [color[1], color[2], color[3]].map(Number);
};
Node.prototype.isMultiLine = function() {
  if (this.node.nodeType === this.TEXT_NODE) {
    const range = document.createRange();
    range.selectNode(this.node);
    return range.getClientRects().length > 1;
  }
  else {
    return false;
  }
};

const PDF = function({
  root = document.body,
  width = 612,
  height = 792,
  padding = 50
} = {}) {
  this.doc = new jspdf.jsPDF({
    orientation: height > width ? 'portrait' : 'landscape',
    unit: 'pt',
    format: [width, height].map(String)
  });
  this.root = root;
  this.height = height;
  this.padding = padding;
  this._fonts = [];
  // adjusting HTML document size
  root.style.width = width + 'px';
  root.style['box-sizing'] = 'border-box';
  root.style.margin = '0';
  root.style.padding = '0 ' + padding / 2 + 'px';
  // remove unsupported font-families
  const myFont = new Font();
  const fonts = {};
  [...root.querySelectorAll('*')]
    .filter(e => e.textContent.trim() && e.children.length === 0)
    .forEach(e => {
      const styles = window.getComputedStyle(e, null);
      // detect style
      e.dataset.style = 'normal';
      const bold = styles['font-weight'] === 'bold' || styles['font-weight'] === '700';

      if (styles['font-style'] === 'italic' && bold) {
        e.dataset.style = 'bolditalic';
      }
      else if (styles['font-style'] === 'italic') {
        e.dataset.style = 'italic';
      }
      else if (bold) {
        e.dataset.style = 'bold';
      }
      // detect font
      const family = e.style['font-family'] = e.dataset.font = myFont.detect(
        e.textContent,
        styles['font-family']
      );
      // change styling as we do not support other types
      if (myFont.normal.indexOf(family) !== -1) {
        e.dataset.style = e.style['font-weight'] = 'normal';
      }
      fonts[family] = fonts[family] || [];
      if (fonts[family].indexOf(e.dataset.style) === -1) {
        fonts[family].push(e.dataset.style);
      }
    });
  this.fonts = fonts;
  myFont.destory();
  // generate pages
  const pages = Math.ceil(root.clientHeight / (height - padding));
  for (let i = 1; i < pages; i += 1) {
    this.doc.addPage();
  }
  // console.log(this.doc.getFontList())
};

PDF.prototype.collect = function() {
  const root = this.root;
  return {
    images: () => {
      function fetch(img) {
        return new Promise(resolve => {
          chrome.runtime.sendMessage({
            method: 'image-to-data',
            src: img.src
          }, data => resolve({
            img,
            data
          }));
        });
      }
      return Promise.all([...root.querySelectorAll('img')].map(fetch)).then(os => {
        return os.filter(o => o.data);
      });
    },
    lines: () => {
      const nodes = [...document.body.getElementsByTagName('*')]
        .filter(node => node.nodeType === node.ELEMENT_NODE)
        .map(node => new Node(node));
      return Promise.resolve(nodes);
    },
    nodes: () => {
      const collect = node => {
        let all = [];
        for (node = node.firstChild; node; node = node.nextSibling) {
          node = new Node(node);
          if (node.nodeType === node.TEXT_NODE) {
            if (node.value.trim()) {
              all.push(node);
            }
          }
          else if (node.nodeType === node.ELEMENT_NODE && node.noChild) {
            if (node.value.trim()) {
              all.push(node);
            }
          }
          else if (node.nodeType === node.ELEMENT_NODE) {
            all = [...all, ...collect(node)];
          }
        }
        return all;
      };
      const nodes = collect(root).filter(node => node.value.trim() && node.rect.width && node.rect.height);
      return Promise.resolve(nodes);
    }
  };
};

PDF.prototype.split = function(node) {
  if (node.isMultiLine()) {
    const r = document.createRange();
    r.setStart(node.node, 0);
    const indices = [
      0,
      ...node.value.split('').map((c, i) => {
        r.setEnd(node.node, i);
        return r.getClientRects().length;
      }).map((v, i, l) => v - (l[i - 1] || v)).map((v, i) => (v ? i - 1 : false)).filter(i => i)
    ];
    return [...node.rects].map((rect, i) => ({
      rect,
      value: node.value.substring(indices[i], indices[i + 1])
    }));
  }
  else {
    return [{
      value: node.value,
      rect: node.rect
    }];
  }
};

PDF.prototype.toBase64 = function(blob) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(';base64,')[1]);
    reader.readAsDataURL(blob);
  });
};

PDF.prototype.addImage = function(node) {
  const rect = node.img.getBoundingClientRect();
  const {left, top, width, height} = this.adjustPage(rect);

  this.doc.addImage(node.data, 'PNG', left, top, width, height);
};

PDF.prototype.font = async function(styles) {
  // font size
  this.doc.setFontSize(styles['font-size']);
  // font family
  this.doc.setFont(styles['font-family'], styles['font-style'] || 'normal');
  // color (only apply if visible)
  const w = Math.sqrt(styles.color.map(a => Math.pow(a, 2)).reduce((p, c) => p + c, 0) / 3);
  if (w < 200) {
    this.doc.setTextColor(...styles.color);
  }
  else {
    this.doc.setTextColor(256 - w, 256 - w, 256 - w);
  }
};

PDF.prototype.addNode = async function(node) {
  await this.font(node.styles);
  return this.split(node).forEach(({rect, value}) => {
    /* const div = document.createElement('div');
    div.style = `
      position: absolute;
      top: ${rect.top}px;
      left: ${rect.left}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      border: solid 1px blue;
    `;
    document.body.appendChild(div); */

    const {left, top, height} = this.adjustPage(rect);
    // make sure text is fitting inside the rect
    /* let loop = true;
    while (loop) {
      let fontSize = this.doc.internal.getFontSize();
      const w = this.doc.getStringUnitWidth(value) * fontSize;
      if (w > width) {
        console.log(width, w, value, fontSize);
        fontSize -= 0.1;
        this.doc.setFontSize(fontSize);
      }
      else {
        loop = false;
      }
    } */
    const lineHeight = this.doc.getLineHeight();
    this.doc.text(value.replace(/\n/g, ''), left, top + lineHeight / 3 + height / 2);
  });
};

PDF.prototype.addLines = function(node) {
  if (node.nodeType !== node.ELEMENT_NODE) {
    return;
  }
  const {top, left, width, height} = this.adjustPage(node.rect);
  // const {top, left, width, height} = node.rect;

  let thickness = node.styles['border-top-width'];
  if (thickness) {
    // console.log(thickness, 'top');
    this.doc.setDrawColor(...node.styles['border-top-color']);
    this.doc.setLineWidth(thickness);
    this.doc.line(left, top + thickness / 2, left + width, top + thickness / 2);
  }
  thickness = node.styles['border-bottom-width'];
  if (thickness) {
    // console.log(thickness, 'bottom');
    this.doc.setDrawColor(...node.styles['border-bottom-color']);
    this.doc.setLineWidth(thickness);
    this.doc.line(left, top + height - thickness / 2, left + width, top + height - thickness / 2);
  }
  thickness = node.styles['border-left-width'];
  if (thickness) {
    // console.log(thickness, 'left');
    this.doc.setDrawColor(...node.styles['border-left-color']);
    this.doc.setLineWidth(thickness);
    this.doc.line(left + thickness / 2, top, left + thickness / 2, top + height);
  }
  thickness = node.styles['border-right-width'];
  if (thickness) {
    // console.log(thickness, 'right');
    this.doc.setDrawColor(...node.styles['border-right-color']);
    this.doc.setLineWidth(thickness);
    this.doc.line(left + width - thickness / 2, top, left + width - thickness / 2, top + height);
  }
};

PDF.prototype.adjustPage = function(rect) {
  const {width, height} = rect;
  let {top, left} = rect;
  left += window.scrollX;
  top += window.scrollY;

  const n = Math.floor(top / (this.height - this.padding));

  this.doc.setPage(n + 1);

  return {
    top: top % (this.height - this.padding) + this.padding / 2,
    left,
    width,
    height
  };
};

PDF.prototype.loadFonts = function() {
  const fonts = [].concat([],
    ...Object.keys(this.fonts).map(family => this.fonts[family].map(style => ({
      family,
      style
    })))
  );
  return Promise.all(fonts.map(({family, style}) => {
    const url = chrome.runtime.getURL('/data/assets/' + family + '/' + style + '.ttf');
    // console.log(url);
    return fetch(url).then(r => r.blob()).then(async blob => {
      const b64 = await this.toBase64(blob);

      const name = family;
      this.doc.addFileToVFS(name, b64);
      this.doc.addFont(name, family, style);
    }, e => console.error(e));
  }));
};

const start = () => storage({
  width: 612,
  height: 792,
  size: config.size,
  padding: 50,
  images: config.images,
  borders: config.borders
}).then(async prefs => {
  const pdf = new PDF({
    width: prefs.size === 'page' ? window.top.document.body.clientWidth : (prefs.width / 0.67),
    height: prefs.size === 'page' ? window.top.document.body.clientHeight : (prefs.height / 0.67),
    padding: prefs.padding / 0.67
  });
  // load fonts;
  await pdf.loadFonts();
  //
  const {nodes, lines, images} = pdf.collect();
  nodes().then(async nodes => {
    for (const node of nodes) {
      await pdf.addNode(node);
    }
  }).then(() => {
    if (prefs.lines) {
      return lines().then(nodes => nodes.forEach(node => pdf.addLines(node)));
    }
  }).then(() => {
    if (prefs.images) {
      return images().then(nodes => {
        nodes.forEach(img => pdf.addImage(img));
      });
    }
  }).then(() => {
    chrome.runtime.sendMessage({
      method: 'download',
      url: pdf.doc.output('datauristring'),
      cmd: search.get('cm'),
      id: search.get('tpid'),
      title: document.title
    });
  }).catch(e => console.log(e));
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
}
else {
  start();
}
