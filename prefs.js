'use strict';

const config = {};
window.config = config;

config['simple-mode'] = true;
config['print-mode'] = true;

config.format = '[title] - [date] [time]';

config.size = 'letter';

config.images = false;
config.borders = false;

config.debug = false;
config.faqs = true;

config.css = `html * {
  font-size: 13px !important;
  line-height: 20px !important;
  font-family: sans-serif, arial !important;
}
h1 {
  font-size: 24px !important;
  line-height: 26.4px !important;
}
h3 {
  font-size: 14px !important;
  line-height: 15.4px !important;
}
blockquote {
  font-size: 21px !important;
  line-height: 30px !important;
}
pre {
  font-family: monospace !important;
  font-size: 12px !important;
  line-height: 18.5714px !important;
}
.bodycontainer>table {
  display: none !important;
}`;
