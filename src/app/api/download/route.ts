
import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fileUrl = searchParams.get('url');

  if (!fileUrl) {
    return new NextResponse('Missing file URL', { status: 400 });
  }

  try {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      return new NextResponse(`Failed to fetch file: ${response.statusText}`, {
        status: response.status,
      });
    }

    const headers = new Headers();
    const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
    headers.set('Content-Type', contentType);

    let filename = 'download';
    try {
      const urlPath = new URL(fileUrl).pathname;
      const parts = urlPath.split('/');
      const lastPart = decodeURIComponent(parts[parts.length - 1]);
      // Remove Firebase Storage specific prefixes like "o/" if present in the last part
      const potentialFilename = lastPart.startsWith('o%2F') ? decodeURIComponent(lastPart.substring(3)) : lastPart;
      
      // Basic sanitization and ensuring it has an extension
      const sanitizedFilename = potentialFilename.replace(/[^a-zA-Z0-9_.\-\s]/g, '_').replace(/\s+/g, '_');

      if (sanitizedFilename.includes('.')) {
        filename = sanitizedFilename;
      } else {
        const extensionMatch = contentType.split('/')[1];
        if (extensionMatch) {
          filename = `${sanitizedFilename}.${extensionMatch}`;
        }
      }
    } catch (e) {
      console.warn('Could not parse filename from URL, using default.', e);
      const extensionMatch = contentType.split('/')[1];
      if (extensionMatch) {
          filename = `download.${extensionMatch}`;
      }
    }
    
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);

    if (response.body) {
      // For Node.js runtime, response.body is a ReadableStream.
      // For Edge runtime, response.body is already a ReadableStream<Uint8Array>.
      // NextResponse can handle ReadableStream directly.
      return new NextResponse(response.body, { headers, status: 200 });
    } else {
      return new NextResponse('Response body is null', { status: 500 });
    }

  } catch (error: any) {
    console.error('Error in download proxy:', error);
    return new NextResponse(`Server error: ${error.message || 'Unknown error'}`, { status: 500 });
  }
}
