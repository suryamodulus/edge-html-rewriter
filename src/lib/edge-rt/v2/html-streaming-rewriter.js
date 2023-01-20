import { SAXParser } from '../parse5-sax-parser';

const saxParser = new SAXParser({ sourceCodeLocationInfo: true })

const transformContent = {
    start() {},
    transform(chunk, controller) {
        saxParser.setController(controller)
        saxParser.transform(chunk)
    },
    flush() {}
}

class HtmlRewriter extends TransformStream {
    constructor() {
      super({...transformContent})
    }
    on(event, handler){
        saxParser.emitter.on(event, handler)
    }
}

export { HtmlRewriter }