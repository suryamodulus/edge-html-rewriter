import { NextResponse } from 'next/server';
// import { RewritingStream } from './lib/edge-rt/parse5-html-rewriter'
import { RewritingStream } from './lib/edge-rt/streamer';

const rewriter = new RewritingStream();

rewriter.on('data', ({ chunk, controller }) => {
  const data = new TextDecoder().decode(chunk);
  const processedData = data.toUpperCase();
  controller.enqueue(new TextEncoder().encode(processedData))
})


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
  res.body.pipeThrough(rewriter)
  return rewriter.readable;
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
