import { NextRequest, NextResponse } from 'next/server';

function resolveBackendUrl(): string {
  if (process.env.NODE_ENV === 'production') {
    return 'http://138.197.187.138';
  }

  const raw = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  return raw.replace(/\/api\/?$/, '').replace(/\/$/, '');
}

const BACKEND_URL = resolveBackendUrl();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathString = path.join('/');
  const url = `${BACKEND_URL}/uploads/${pathString}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return new NextResponse('Image not found', { status: 404 });
    }

    // Get image as buffer
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    return new NextResponse('Image not found', { status: 404 });
  }
}
