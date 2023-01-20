import { html } from 'parse5';
import { SAXParser } from './parse5-sax-parser';
import { escapeText, escapeAttribute } from './utils';

export class RewritingStream extends SAXParser {
  /** Note: `sourceCodeLocationInfo` is always enabled. */
  constructor() {
    super({ sourceCodeLocationInfo: true });
    this.controller = null
  }

  on(event, handler){
    this.emitter.on(event, handler)
  }

  setController(controller){
    this.controller = controller
  }
  
  //`Transform` implementation
  transform(chunk) {
    if (typeof chunk !== 'string') {
      throw new TypeError('Parser can work only with string streams.');
    }
    this._transformChunk(chunk);
  }

  _enqueueData(data){
    this.controller.enqueue(new TextEncoder().encode(data));
  }

  _transformChunk(chunk) {
    // NOTE: ignore upstream return values as we want to push to
    // the `Writable` part of the `Transform` stream ourselves.
    super._transformChunk(chunk);
    return '';
  }

  _getRawHtml(location) {
    const { droppedBufferSize, html } = this.tokenizer.preprocessor;
    const start = location.startOffset - droppedBufferSize;
    const end = location.endOffset - droppedBufferSize;
    return html.slice(start, end);
  }
  // Events
  emitIfListenerExists(eventName, token) {
    if (!super.emitIfListenerExists(eventName, token)) {
      this.emitRaw(this._getRawHtml(token.sourceCodeLocation));
    }
    // NOTE: don't skip new lines after `<pre>` and other tags,
    // otherwise we'll have incorrect raw data.
    this.parserFeedbackSimulator.skipNextNewLine = false;
    return true;
  }
  // Emitter API
  _emitToken(eventName, token) {
    this.emitter.emit(eventName, token, this._getRawHtml(token.sourceCodeLocation));
  }
  /** Emits a serialized document type token into the output stream. */
  emitDoctype(token) {
    let res = `<!DOCTYPE ${token.name}`;
    if (token.publicId !== null) {
      res += ` PUBLIC "${token.publicId}"`;
    } else if (token.systemId !== null) {
      res += ' SYSTEM';
    }
    if (token.systemId !== null) {
      res += ` "${token.systemId}"`;
    }
    res += '>';
    this._enqueueData(res);
  }
  /** Emits a serialized start tag token into the output stream. */
  emitStartTag(token) {
    let res = `<${token.tagName}`;
    for (const attr of token.attrs) {
      res += ` ${attr.name}="${escapeAttribute(attr.value)}"`;
    }
    res += token.selfClosing ? '/>' : '>';
    this._enqueueData(res);
  }
  /** Emits a serialized end tag token into the output stream. */
  emitEndTag(token) {
    this._enqueueData(`</${token.tagName}>`);
  }
  /** Emits a serialized text token into the output stream. */
  emitText({ text }) {
    this._enqueueData(
      !this.parserFeedbackSimulator.inForeignContent &&
        html.hasUnescapedText(this.tokenizer.lastStartTagName, true)
        ? text
        : escapeText(text),
    );
  }
  /** Emits a serialized comment token into the output stream. */
  emitComment(token) {
    this._enqueueData(`<!--${token.text}-->`);
  }
  /** Emits a raw HTML string into the output stream. */
  emitRaw(html) {
    this._enqueueData(html);
  }
}
//# sourceMappingURL=index.js.map
