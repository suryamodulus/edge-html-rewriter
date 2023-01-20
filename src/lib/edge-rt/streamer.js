import mitt from 'mitt';

const emitter = mitt()

class RewritingStream extends TransformStream {
    constructor() {
        super({
            transform(chunk, controller) {
                emitter.emit('data',  { chunk, controller })
            }
        });
        this.emitter = emitter
    }
    on(event, handler) {
        emitter.on(event, handler);
    }
}

// export { UpperCaseTransformStream as RewritingStream }
export { RewritingStream }