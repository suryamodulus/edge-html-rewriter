export class DevNullStream extends WritableStream {
  _write(_chunk, _encoding, cb) {
    cb();
  }
}
