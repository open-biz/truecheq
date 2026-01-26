import { NextRequest, NextResponse } from 'next/server';
import { uploadImageToFilebase, uploadMetadataToFilebase, getFilebaseUrl, type DealMetadata } from '@/lib/filebase';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const type = formData.get('type') as string;

    if (type === 'image') {
      const file = formData.get('file') as File;
      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      const { fileName, cid } = await uploadImageToFilebase(file);
      const url = getFilebaseUrl(fileName, cid);

      return NextResponse.json({ url, fileName, cid });
    }

    if (type === 'metadata') {
      const metadataJson = formData.get('metadata') as string;
      if (!metadataJson) {
        return NextResponse.json({ error: 'No metadata provided' }, { status: 400 });
      }

      const metadata: DealMetadata = JSON.parse(metadataJson);
      const { fileName, cid } = await uploadMetadataToFilebase(metadata);
      const url = getFilebaseUrl(fileName, cid);

      return NextResponse.json({ url, fileName, cid });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}
