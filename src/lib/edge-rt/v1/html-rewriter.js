
import { RewritingStream } from './parse5-html-rewriter'

const rewriter = new RewritingStream()

class HtmlRewriter extends TransformStream {
    constructor() {
        super({
            start(controller){
              rewriter.setController(controller)
            },
            transform(chunk) {
              rewriter.transform(new TextDecoder().decode(chunk))
            },
            flush(){
              rewriter.flush()
            }
        });
        this.stream = rewriter
    }
}

export { HtmlRewriter }