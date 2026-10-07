import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

function arrayBufferToBase64(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const chunkSize = 0x8000;
  let binary = '';

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }

  return btoa(binary);
}

export async function POST(request) {
  try {
    const cloudflareContext = await getCloudflareContext({ async: true });
    const apiKey =
      cloudflareContext?.env?.IMGBB_API_KEY || process.env.IMGBB_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'IMGBB_API_KEY is not configured',
        },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const image = formData.get('image');
    const name = String(formData.get('name') || 'project-image');

    if (!(image instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Image file is required',
        },
        { status: 400 }
      );
    }

    if (image.size === 0) {
      return NextResponse.json(
        { success: false, error: 'Image file is empty' },
        { status: 400 },
      );
    }

    if (image.size > 32 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'Image file must be smaller than 32 MB' },
        { status: 413 },
      );
    }

    const base64Image = arrayBufferToBase64(await image.arrayBuffer());

    const uploadBody = new URLSearchParams();
    uploadBody.set('image', base64Image);
    uploadBody.set('name', name);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: uploadBody,
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload?.success) {
      const upstreamMessage = payload?.error?.message || payload?.status_txt;
      throw new Error(
        `imgBB upload failed (${response.status})${upstreamMessage ? `: ${upstreamMessage}` : ''}`,
      );
    }

    return NextResponse.json(
      {
        success: true,
        imageUrl: payload?.data?.url || '',
        displayUrl: payload?.data?.display_url || '',
        deleteUrl: payload?.data?.delete_url || '',
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}