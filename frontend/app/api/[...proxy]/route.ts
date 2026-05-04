/**
 * API Proxy Route
 * Forwards all /api/* requests to the backend server
 * This avoids CORS and Mixed Content issues on Vercel
 */

import { NextRequest, NextResponse } from 'next/server';

function resolveBackendUrl(): string {
  const fallback =
    process.env.NODE_ENV === 'production'
      ? 'http://138.197.187.138'
      : 'http://localhost:5000';

  const raw = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || fallback;
  const normalized = raw.replace(/\/api\/?$/, '').replace(/\/$/, '');

  if (process.env.NODE_ENV === 'production') {
    return normalized
      .replace('http://localhost:5000', 'http://138.197.187.138')
      .replace('http://127.0.0.1:5000', 'http://138.197.187.138')
      .replace('http://138.197.187.138:5000', 'http://138.197.187.138');
  }

  return normalized;
}

const BACKEND_URL = resolveBackendUrl();

export async function GET(request: NextRequest) {
  return proxyRequest(request, 'GET');
}

export async function POST(request: NextRequest) {
  return proxyRequest(request, 'POST');
}

export async function PUT(request: NextRequest) {
  return proxyRequest(request, 'PUT');
}

export async function DELETE(request: NextRequest) {
  return proxyRequest(request, 'DELETE');
}

export async function PATCH(request: NextRequest) {
  return proxyRequest(request, 'PATCH');
}

async function proxyRequest(request: NextRequest, method: string) {
  try {
    // Get the path after /api/
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);

    // Remove 'api' from the beginning
    pathSegments.shift();
    const backendPath = pathSegments.join('/');
    const queryString = url.search;

    // Build backend URL
    const backendFullUrl = `${BACKEND_URL}/api/${backendPath}${queryString}`;

    // Forward headers
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      // Skip host header
      if (key.toLowerCase() !== 'host') {
        headers[key] = value;
      }
    });

    // Get body for POST/PUT/PATCH
    let body: string | undefined;
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      body = await request.text();
    }

    // Make request to backend
    const response = await fetch(backendFullUrl, {
      method,
      headers,
      body,
    });

    // Get response body
    const responseBody = await response.text();

    // Forward response
    return new NextResponse(responseBody, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch (error: any) {
    console.error('[Proxy] Error:', error.message);
    return NextResponse.json(
      { error: 'Proxy error', message: error.message },
      { status: 500 }
    );
  }
}
