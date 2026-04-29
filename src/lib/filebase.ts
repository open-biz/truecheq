import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

const FILEBASE_ENDPOINT = 'https://s3.filebase.com';
const FILEBASE_BUCKET = process.env.NEXT_PUBLIC_FILEBASE_BUCKET || 'trucheq';

export const s3Client = new S3Client({
  endpoint: FILEBASE_ENDPOINT,
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.FILEBASE_ACCESS_KEY || '',
    secretAccessKey: process.env.FILEBASE_SECRET_KEY || '',
  },
});

export interface DealMetadata {
  itemName: string;
  description: string;
  price: string;
  images: string[];
  seller: string;
  createdAt: number;
  isOrbVerified: boolean;
  verificationLevel?: 'none' | 'device' | 'orb';
}

async function getCIDWithRetry(fileName: string, retries = 5): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      const head = await s3Client.send(new HeadObjectCommand({
        Bucket: FILEBASE_BUCKET,
        Key: fileName,
      }));
      if (head.Metadata?.cid) {
        return head.Metadata.cid;
      }
    } catch (e) {
      console.error(`Retry ${i + 1} to get CID failed:`, e);
    }
    // Wait longer each time
    await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
  }
  return '';
}

export async function uploadImageToFilebase(file: File): Promise<{ fileName: string, cid: string }> {
  const fileName = `images/${Date.now()}-${file.name}`;
  
  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: FILEBASE_BUCKET,
      Key: fileName,
      Body: file,
      ContentType: file.type,
    },
  });

  await upload.done();

  const cid = await getCIDWithRetry(fileName);
  
  return { 
    fileName, 
    cid 
  };
}

export async function uploadMetadataToFilebase(metadata: DealMetadata): Promise<{ fileName: string, cid: string }> {
  const fileName = `metadata/${Date.now()}-${metadata.seller.slice(0, 8)}.json`;
  
  const command = new PutObjectCommand({
    Bucket: FILEBASE_BUCKET,
    Key: fileName,
    Body: JSON.stringify(metadata, null, 2),
    ContentType: 'application/json',
  });

  await s3Client.send(command);

  const cid = await getCIDWithRetry(fileName);
  
  return { 
    fileName, 
    cid 
  };
}

export function getFilebaseUrl(fileName: string, cid?: string): string {
  const gateway = process.env.NEXT_PUBLIC_FILEBASE_GATEWAY;
  if (gateway && cid) {
    return `https://${gateway}/ipfs/${cid}`;
  }
  if (gateway && !cid && fileName.startsWith('Qm')) { // Fallback if CID is passed as fileName
    return `https://${gateway}/ipfs/${fileName}`;
  }
  return `https://${FILEBASE_BUCKET}.s3.filebase.com/${fileName}`;
}

export function getIPFSGatewayUrl(cid: string): string {
  const gateway = process.env.NEXT_PUBLIC_FILEBASE_GATEWAY;
  if (gateway) {
    return `https://${gateway}/ipfs/${cid}`;
  }
  return `https://ipfs.filebase.io/ipfs/${cid}`;
}
