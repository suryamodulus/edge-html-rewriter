import { NextResponse } from 'next/server';
import { HtmlRewriter } from './lib/edge-rt/v1/html-rewriter';

const htmlRewriter = new HtmlRewriter();

htmlRewriter.stream.on('startTag', (startTag, raw) => {
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
  htmlRewriter.stream.emitStartTag(startTag);
});

htmlRewriter.stream.on('endTag', (endTag) => {
  htmlRewriter.stream.emitEndTag(endTag);
});


const baseUrl = 'https://mydukaan.io';
let storeSlug = '';

// config with custom matcher
export const config = {
  matcher: '/:path*',
};

export default async function middleware(request) {
  const { pathname, hostname } = new URL(request.url);
  if(hostname.startsWith('127.0.0.1') || hostname.startsWith('localhost')){
    storeSlug = `nomana`;
  }
  else{
    storeSlug = hostname.split('.')[0];
  }

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

  if (contentType.startsWith('text/html')) {
    return rewriteResposeHtml(res);
  } else {
    return res;
  }
}


function responseToReadableStream(res) {
  res.body.pipeThrough(htmlRewriter)
  return htmlRewriter.readable;
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
