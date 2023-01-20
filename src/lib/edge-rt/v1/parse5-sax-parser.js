import { ParserFeedbackSimulator } from './parser-feedback-simulator.js';
import EventEmitter from 'eventemitter3';

export class SAXParser {
  /**
   * @param options Parsing options.
   */
  constructor(options = {}) {
    this.pendingText = null;
    this.lastChunkWritten = false;
    this.stopped = false;
    this.emitter = new EventEmitter()
    this.options = {
      sourceCodeLocationInfo: false,
      ...options,
    };
    this.parserFeedbackSimulator = new ParserFeedbackSimulator(
      this.options,
      this,
    );
    this.tokenizer = this.parserFeedbackSimulator.tokenizer;
    // NOTE: always pipe the stream to the /dev/null stream to avoid
    // the `highWaterMark` to be hit even if we don't have consumers.
    // (see: https://github.com/inikulin/parse5/issues/97#issuecomment-171940774)
    // this.readable.pipeTo(new DevNullStream());
  }

  flush() {
    this.lastChunkWritten = true;
    this._transformChunk('');
  }

  stop() {
    this.stopped = true;
    this.tokenizer.pause();
  }
  //Internals
  _transformChunk(chunk) {
    if (!this.stopped) {
      this.tokenizer.write(chunk, this.lastChunkWritten);
    }
    return chunk;
  }
  /** @internal */
  onCharacter({ chars, location }) {
    if (this.pendingText === null) {
      this.pendingText = { text: chars, sourceCodeLocation: location };
    } else {
      this.pendingText.text += chars;
      if (location && this.pendingText.sourceCodeLocation) {
        const { endLine, endCol, endOffset } = location;
        this.pendingText.sourceCodeLocation = {
          ...this.pendingText.sourceCodeLocation,
          endLine,
          endCol,
          endOffset,
        };
      }
    }
    if (this.tokenizer.preprocessor.willDropParsedChunk()) {
      this._emitPendingText();
    }
  }
  /** @internal */
  onWhitespaceCharacter(token) {
    this.onCharacter(token);
  }
  /** @internal */
  onNullCharacter(token) {
    this.onCharacter(token);
  }
  /** @internal */
  onEof() {
    this._emitPendingText();
    this.stopped = true;
  }
  /** @internal */
  onStartTag(token) {
    this._emitPendingText();
    const startTag = {
      tagName: token.tagName,
      attrs: token.attrs,
      selfClosing: token.selfClosing,
      sourceCodeLocation: token.location,
    };
    this.emitIfListenerExists('startTag', startTag);
  }
  /** @internal */
  onEndTag(token) {
    this._emitPendingText();
    const endTag = {
      tagName: token.tagName,
      sourceCodeLocation: token.location,
    };
    this.emitIfListenerExists('endTag', endTag);
  }
  /** @internal */
  onDoctype(token) {
    this._emitPendingText();
    const doctype = {
      name: token.name,
      publicId: token.publicId,
      systemId: token.systemId,
      sourceCodeLocation: token.location,
    };
    this.emitIfListenerExists('doctype', doctype);
  }
  /** @internal */
  onComment(token) {
    this._emitPendingText();
    const comment = {
      text: token.data,
      sourceCodeLocation: token.location,
    };
    this.emitIfListenerExists('comment', comment);
  }
  emitIfListenerExists(eventName, token) {
    if (this.emitter.listenerCount(eventName) === 0) {
      return false;
    }
    this._emitToken(eventName, token);
    return true;
  }
  _emitToken(eventName, token) {
    this.emitter.emit(eventName, token);
  }
  _emitPendingText() {
    if (this.pendingText !== null) {
      this.emitIfListenerExists('text', this.pendingText);
      this.pendingText = null;
    }
  }
}
