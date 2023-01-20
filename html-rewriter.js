import { RewritingStream } from 'parse5-html-rewriting-stream';
import https from 'https';
import fs from 'fs';

const file = fs.createWriteStream('store.html');
const rewriter = new RewritingStream();

// Replace divs with spans
rewriter.on('startTag', (startTag, raw) => {
  if (startTag.tagName === 'script' || startTag.tagName === 'link') {
    startTag.attrs = startTag.attrs.map((attr) => {
      if (
        (attr?.name === 'src' || attr?.name === 'href') &&
        attr?.value.startsWith('/public')
      ) {
        attr.value = attr.value.replace(
          '/public',
          'https://mydukaan.io/public',
        );
      }
      return attr;
    });
  }
  rewriter.emitStartTag(startTag);
});

rewriter.on('endTag', (endTag) => {
  if (endTag.tagName === 'span') {
    endTag.tagName = 'div';
  }

  rewriter.emitEndTag(endTag);
});

https.get('https://mydukaan.io/enigma', (res) => {
  // Assumes response is UTF-8.
  res.setEncoding('utf8');
  // `RewritingStream` is a `Transform` stream, which means you can pipe
  // through it.
  res.pipe(rewriter).pipe(file);
});
