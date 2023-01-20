import { 
  HTMLRewriter 
} from 'https://ghuc.cc/worker-tools/html-rewriter/index.ts'


const baseUrl = `https://mydukaan.io`;

let storeSlug = '';
let customDomain = '';

async function handleRequest(request) {
const { pathname, hostname } = new URL(request.url);
customDomain = hostname;
// storeSlug = `nomana`;
storeSlug = hostname.split('.')[0];
if (request.method !== 'GET') return MethodNotAllowed(request);
let storeUrl = ``;
if (pathname.endsWith('.js') || pathname.endsWith('.css')) {
  storeUrl = `${baseUrl}${pathname}`;
} else {
  const customPathname = pathname.replace(`/${storeSlug}`, '');
  storeUrl = `${baseUrl}/${storeSlug}${customPathname}`;
}
const res = await fetch(storeUrl);
const contentType = res.headers.get('Content-Type');

// If the response is HTML, it can be transformed with
// HTMLRewriter -- otherwise, it should pass through
if (contentType.startsWith('text/html')) {
  return rewriter.transform(res);
  // return new Response(await res.text(), {
  //   headers: {
  //     'content-type': 'text/raw;charset=UTF-8',
  //   },
  // });
} else {
  return res;
}
}

class LinkRewriter {
constructor(attributeName) {
  this.attributeName = attributeName;
}
element(element) {
  const attribute = element.getAttribute(this.attributeName);
  if (attribute) {
    if (
      (this.attributeName === 'href' || this.attributeName === 'src') &&
      attribute.startsWith('/public')
    ) {
      element.setAttribute(
        this.attributeName,
        attribute.replace('/public', `${baseUrl}/public`),
      );
    } else if (
      this.attributeName === 'href' &&
      attribute.startsWith(`/${storeSlug}`)
    ) {
      if (attribute === `/${storeSlug}`) {
        element.setAttribute(
          this.attributeName,
          attribute.replace(`/${storeSlug}`, `/`),
        );
      } else {
        element.setAttribute(
          this.attributeName,
          attribute.replace(`/${storeSlug}`, ``),
        );
      }
    } else if (
      this.attributeName === 'onclick' &&
      attribute.includes(`/${storeSlug}`)
    ) {
      element.setAttribute(
        this.attributeName,
        attribute.replace(`/${storeSlug}`, ``),
      );
    }
  }
}
}

class ScriptDataRewriter {
constructor(dataName) {
  this.dataName = dataName;
}
buffer = '';
text(text) {
  this.buffer += text.text;

  if (text.lastInTextNode && this.buffer !== '{}') {
    try {
      let data = JSON.parse(this.buffer);
      if (this.dataName === '__DUKAAN_DATA__') {
        data['DUKAAN_BASE_URL'] = '';
      } else if (this.dataName === '__NEXT_DATA__') {
        data['props']['pageProps']['isCustomDomain'] = true;
        data['props']['pageProps']['customDomain'] = customDomain;
      }
      // We're done with this text node -- search and replace and reset.
      text.replace(JSON.stringify(data));
      this.buffer = '';
    } catch (err) {}
  } else {
    // This wasn't the last text chunk, and we don't know if this chunk
    // will participate in a match. We must remove it so the client
    // doesn't see it.
    text.remove();
  }
}
}

const rewriter = new HTMLRewriter()
.on('link', new LinkRewriter('href'))
.on('script', new LinkRewriter('src'))
.on('a', new LinkRewriter('href'))
.on('button', new LinkRewriter('onclick'))
.on('script[id="__DUKAAN_DATA__"]', new ScriptDataRewriter('__DUKAAN_DATA__'))
.on('script[id="__NEXT_DATA__"]', new ScriptDataRewriter('__NEXT_DATA__'));

function MethodNotAllowed(request) {
return new Response(`Method ${request.method} not allowed.`, {
  status: 405,
  headers: {
    Allow: 'GET',
  },
});
}

addEventListener('fetch', function (event) {
event.respondWith(handleRequest(event.request));
});
