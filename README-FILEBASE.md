# Filebase IPFS Integration for TruCheq

This document explains how to set up and use Filebase for decentralized storage of deal metadata and images.

## What is Filebase?

Filebase is an S3-compatible object storage service backed by IPFS (InterPlanetary File System). It provides:
- Decentralized storage without a centralized database
- IPFS pinning to keep your data available
- S3-compatible API for easy integration
- Free tier with generous storage limits

## Setup Instructions

### 1. Create a Filebase Account

1. Go to [https://filebase.com](https://filebase.com)
2. Sign up for a free account
3. Create a bucket (e.g., `trucheq`)

### 2. Get Your API Credentials

From your Filebase dashboard:
1. Navigate to **Access Keys**
2. Create a new access key
3. Copy your **Access Key ID** and **Secret Access Key**

### 3. Configure Environment Variables

Create a `.env.local` file in the root of your project:

```bash
# Filebase S3 Credentials
FILEBASE_ACCESS_KEY=your_access_key_here
FILEBASE_SECRET_KEY=your_secret_key_here
NEXT_PUBLIC_FILEBASE_BUCKET=trucheq
```

**Important:** Replace the placeholder values with your actual Filebase credentials.

### 4. Create Your Filebase Bucket

1. In Filebase dashboard, go to **Buckets**
2. Click **Create Bucket**
3. Name it `trucheq` (or whatever you set in `NEXT_PUBLIC_FILEBASE_BUCKET`)
4. Select IPFS storage network
5. Create the bucket

### 5. Set Up Gateway (Optional)

For faster access, you can create a custom gateway:
1. Go to **Gateways** in Filebase
2. Click **Create Gateway**
3. Select your bucket
4. Choose access level (Private or Public)
5. Copy your gateway URL (e.g., `parallel-pink-stork.myfilebase.com`)

## How It Works

### Architecture

```
┌─────────────────┐
│  DealCreator    │  ← User uploads images + metadata
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  /api/upload    │  ← API route handles uploads
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Filebase S3    │  ← Stores files on IPFS
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  IPFS Network   │  ← Decentralized storage
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   DealGate      │  ← Fetches and displays metadata
└─────────────────┘
```

### Data Flow

1. **Creating a Deal:**
   - User fills out form with item name, price, secret content
   - User uploads images (max 5)
   - Images are uploaded to Filebase → IPFS
   - Metadata JSON is created and uploaded to Filebase → IPFS
   - Metadata URL is stored and shared with the deal link
   - Blockchain transaction creates the deal on-chain

2. **Viewing a Deal:**
   - User opens deal link with `?meta=` parameter
   - DealGate fetches metadata from Filebase/IPFS
   - Images and item details are displayed
   - Secret content is revealed after payment

### Metadata Structure

```typescript
interface DealMetadata {
  itemName: string;        // e.g., "Rolex Submariner"
  description: string;     // Item description
  price: string;           // Price in CRO
  images: string[];        // Array of Filebase URLs
  secret: string;          // Hidden content
  seller: string;          // Seller wallet address
  createdAt: number;       // Timestamp
}
```

### Example Metadata JSON

```json
{
  "itemName": "Rolex Submariner",
  "description": "Item: Rolex Submariner",
  "price": "500",
  "images": [
    "https://trucheq.s3.filebase.com/images/1737745200000-watch1.jpg",
    "https://trucheq.s3.filebase.com/images/1737745201000-watch2.jpg"
  ],
  "secret": "https://meet.google.com/secret-link-here",
  "seller": "0x1234567890abcdef...",
  "createdAt": 1737745200000
}
```

## File Structure

```
src/
├── lib/
│   └── filebase.ts              # Filebase S3 client & upload utilities
├── app/
│   └── api/
│       └── upload/
│           └── route.ts         # API endpoint for uploads
├── components/
│   ├── DealCreator.tsx          # Upload images & create deals
│   └── DealGate.tsx             # Fetch & display metadata
```

## API Endpoints

### POST `/api/upload`

Upload images or metadata to Filebase.

**Request (Image Upload):**
```typescript
FormData {
  type: 'image',
  file: File
}
```

**Response:**
```json
{
  "url": "https://trucheq.s3.filebase.com/images/1737745200000-image.jpg",
  "fileName": "images/1737745200000-image.jpg"
}
```

**Request (Metadata Upload):**
```typescript
FormData {
  type: 'metadata',
  metadata: JSON.stringify(DealMetadata)
}
```

**Response:**
```json
{
  "url": "https://trucheq.s3.filebase.com/metadata/1737745200000-0x123456.json",
  "fileName": "metadata/1737745200000-0x123456.json"
}
```

## Usage Example

### Creating a Deal with Images

```typescript
// 1. Upload images
const imageUrls = [];
for (const image of images) {
  const formData = new FormData();
  formData.append('type', 'image');
  formData.append('file', image);
  
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });
  
  const { url } = await response.json();
  imageUrls.push(url);
}

// 2. Create metadata
const metadata = {
  itemName: "Rolex Watch",
  description: "Vintage 1970s Rolex",
  price: "500",
  images: imageUrls,
  secret: "https://secret-link.com",
  seller: address,
  createdAt: Date.now(),
};

// 3. Upload metadata
const metadataFormData = new FormData();
metadataFormData.append('type', 'metadata');
metadataFormData.append('metadata', JSON.stringify(metadata));

const metadataResponse = await fetch('/api/upload', {
  method: 'POST',
  body: metadataFormData,
});

const { url: metadataUrl } = await metadataResponse.json();

// 4. Share deal link with metadata
const dealLink = `${window.location.origin}/deal/${dealId}?meta=${encodeURIComponent(metadataUrl)}`;
```

## Benefits of This Approach

✅ **Decentralized:** No centralized database, all data on IPFS  
✅ **Cost-Effective:** Free tier covers most use cases  
✅ **Immutable:** IPFS content addressing ensures data integrity  
✅ **Fast:** S3-compatible API with global CDN  
✅ **Simple:** No blockchain storage costs for images/metadata  
✅ **Scalable:** Can handle unlimited deals and images  

## Troubleshooting

### Images Not Loading
- Check that your Filebase bucket is set to public access
- Verify the bucket name in `.env.local` matches your Filebase bucket
- Check browser console for CORS errors

### Upload Failing
- Verify your API credentials are correct
- Check that you haven't exceeded your Filebase storage limit
- Ensure file sizes are reasonable (< 10MB per image)

### Metadata Not Fetching
- Verify the metadata URL is correctly encoded in the deal link
- Check network tab to see if the fetch request is succeeding
- Ensure the metadata JSON is valid

## Security Considerations

1. **API Keys:** Never commit `.env.local` to version control
2. **Secret Content:** Consider encrypting secrets before upload
3. **Access Control:** Use private buckets for sensitive data
4. **Rate Limiting:** Implement rate limiting on upload endpoint

## Future Enhancements

- [ ] Add encryption for secret content
- [ ] Implement image compression before upload
- [ ] Add IPFS CID verification
- [ ] Support for video/document uploads
- [ ] Batch upload optimization
- [ ] Progress indicators for large uploads

## Resources

- [Filebase Documentation](https://docs.filebase.com/)
- [IPFS Documentation](https://docs.ipfs.tech/)
- [AWS S3 SDK Documentation](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/)
