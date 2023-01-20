import { NextResponse } from 'next/server';
import { SAXParser } from './lib/edge-rt/parse5-sax-parser';
import emitter from './lib/edge-rt/emitter';

const parser = new SAXParser();

// emitter.on('script', (scriptElement, documentWrite, resume) => {
//   const src = scriptElement.attrs.find(({ name }) => name === 'src').value;
//   console.log(src);
//   resume();
// });

// parser.on('text', (text) => {
//   // Handle page text content
//   console.log(text);
// });

const baseUrl = 'https://mydukaan.io';
let storeSlug = '';
let customDomain = '';

// config with custom matcher
export const config = {
  matcher: '/:path*',
};

export default async function middleware(request) {
  const { pathname, hostname } = new URL(request.url);
  customDomain = hostname;
  storeSlug = `nomana`;
  // storeSlug = hostname.split('.')[0];
  if (request.method !== 'GET') return MethodNotAllowed(request);
  let storeUrl = ``;
  if (
    pathname.endsWith('.js') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.svg')
  ) {
    storeUrl = `${baseUrl}${pathname}`;
  } else {
    const customPathname = pathname.replace(`/${storeSlug}`, '');
    storeUrl = `${baseUrl}/${storeSlug}${customPathname}`;
  }
  const res = await fetch(storeUrl);
  const contentType = res.headers.get('Content-Type');
  // console.log(res.body)

  // If the response is HTML, it can be transformed with
  // HTMLRewriter -- otherwise, it should pass through
  if (contentType.startsWith('text/html')) {
    return rewriteResposeHtml(res);
    // return new Response(await res.text(), {
    //   headers: {
    //     'content-type': 'text/raw;charset=UTF-8',
    //   },
    // });
  } else {
    return res;
  }
}

function responseToReadableStream(res) {
  const reader = res.body.getReader();
  let { readable, writable } = new TransformStream();
  const stream = new ReadableStream({
    start(controller) {
      return pump();
      function pump() {
        return reader.read().then(({ done, value }) => {
          // When no more data needs to be consumed, close the stream
          if (done) {
            controller.close();
            return;
          }
          // Enqueue the next data chunk into our target stream
          controller.enqueue(value);
          return pump();
        });
      }
    },
  });
  stream.pipeTo(parser).pipeTo(writable);
  return readable;
}

async function rewriteResposeHtml(res) {
  return new NextResponse(responseToReadableStream(res), {
    status: 200,
    headers: {
      'content-type': 'text/html',
    },
  });
}

function MethodNotAllowed(request) {
  return new NextResponse(`Method ${request.method} not allowed.`, {
    status: 405,
    headers: {
      Allow: 'GET',
    },
  });
}
