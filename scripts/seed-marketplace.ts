import { s3Client, getFilebaseUrl, type DealMetadata } from '../src/lib/filebase';
import { PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

const FILEBASE_BUCKET = 'trucheq';

// Demo seller address — configurable via DEMO_SELLER_ADDRESS env var.
// Falls back to the known demo address for backwards compatibility.
const SELLER_ADDRESS =
  process.env.DEMO_SELLER_ADDRESS ||
  '0x8677e5831257e52a35d1463cfb414eda34344f4f';

// Re-use the same seller address for all demo listings
const SELLERS = [
  SELLER_ADDRESS,
  SELLER_ADDRESS,
  SELLER_ADDRESS,
  SELLER_ADDRESS,
  SELLER_ADDRESS,
];

// Watch listings data - using free watch images
const WATCH_LISTINGS = [
  {
    itemName: 'Rolex Submariner Date',
    description: '42mm stainless steel, black dial, ceramic bezel. Excellent condition with box and papers.',
    images: ['https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400&h=300&fit=crop'],
  },
  {
    itemName: 'Omega Speedmaster Professional',
    description: 'Moonwatch manual wind chronograph. hesalite crystal, full set. serviced 2024.',
    images: ['https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=400&h=300&fit=crop'],
  },
  {
    itemName: 'Cartier Santos de Cartier',
    description: 'Medium size, stainless steel, blue cabochon crown. Quick-release strap system.',
    images: ['https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400&h=300&fit=crop'],
  },
  {
    itemName: 'Patek Philippe Calatrava',
    description: 'Ref 5119J, 18k yellow gold, enamel dial, leaf hands. Very rare reference.',
    images: ['https://images.unsplash.com/photo-1526045431048-f857369baa09?w=400&h=300&fit=crop'],
  },
  {
    itemName: 'Audemars Piguet Royal Oak',
    description: '41mm stainless steel, blue tapisserie dial, integrated bracelet. Full set.',
    images: ['https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=400&h=300&fit=crop'],
  },
];

async function getCID(fileName: string): Promise<string> {
  for (let i = 0; i < 10; i++) {
    try {
      const head = await s3Client.send(new HeadObjectCommand({
        Bucket: FILEBASE_BUCKET,
        Key: fileName,
      }));
      if (head.Metadata?.cid) {
        return head.Metadata.cid;
      }
    } catch (e) {
      // Object might not be available yet
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return '';
}

async function uploadImage(imageUrl: string): Promise<string> {
  // Fetch image and upload to Filebase
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  const fileName = `images/seed-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
  
  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: FILEBASE_BUCKET,
      Key: fileName,
      Body: blob,
      ContentType: 'image/jpeg',
    },
  });

  await upload.done();
  const cid = await getCID(fileName);
  console.log(`  Image uploaded: ${cid}`);
  return getFilebaseUrl(fileName, cid);
}

async function uploadMetadata(metadata: DealMetadata): Promise<{ cid: string; url: string }> {
  const fileName = `metadata/seed-${Date.now()}-${metadata.seller.slice(0, 8)}.json`;
  
  const command = new PutObjectCommand({
    Bucket: FILEBASE_BUCKET,
    Key: fileName,
    Body: JSON.stringify(metadata, null, 2),
    ContentType: 'application/json',
  });

  await s3Client.send(command);
  const cid = await getCID(fileName);
  const url = getFilebaseUrl(fileName, cid);
  
  return { cid, url };
}

async function main() {
  console.log('🚀 Seeding marketplace with 5 watch listings (1 USDC each)...\n');

  const results: Array<{
    name: string;
    cid: string;
    url: string;
    price: string;
    isOrbVerified: boolean;
  }> = [];

  for (let i = 0; i < WATCH_LISTINGS.length; i++) {
    const listing = WATCH_LISTINGS[i];
    const seller = SELLERS[i];
    const isOrbVerified = i < 3; // First 3 are Orb verified, rest are device verified

    console.log(`\n📦 Listing ${i + 1}/5: ${listing.itemName}`);
    
    // Upload image first
    console.log('  📸 Uploading image...');
    const imageUrl = await uploadImage(listing.images[0]);

    // Create metadata
    const metadata: DealMetadata = {
      itemName: listing.itemName,
      description: listing.description,
      price: '1', // 1 USDC
      images: [imageUrl],
      seller,
      createdAt: Date.now() - (i * 86400000), // Stagger creation dates
      isOrbVerified,
    };

    // Upload metadata to IPFS
    console.log('  📄 Uploading metadata to IPFS...');
    const { cid, url } = await uploadMetadata(metadata);
    
    console.log(`  ✅ CID: ${cid}`);
    console.log(`  🔗 URL: ${url}`);

    results.push({
      name: listing.itemName,
      cid,
      url,
      price: '1',
      isOrbVerified,
    });
  }

  console.log('\n\n🎉 Seeding complete! Listing details:\n');
  console.log('// Add these to your marketplace page:\n');
  console.log('const SEED_LISTINGS = ' + JSON.stringify(results.map(r => ({
    cid: r.cid,
    seller: r.cid === r.cid ? SELLERS[results.indexOf(r)] : '',
    price: r.price,
    metadataUrl: r.url,
    isOrbVerified: r.isOrbVerified,
    metadata: {
      itemName: r.name,
      description: WATCH_LISTINGS[results.indexOf(r)].description,
      price: r.price,
      images: WATCH_LISTINGS[results.indexOf(r)].images,
      seller: SELLERS[results.indexOf(r)],
      createdAt: Date.now(),
      isOrbVerified: r.isOrbVerified,
    }
  })), null, 2) + ';');
}

main().catch(console.error);