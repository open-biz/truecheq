import { NextRequest, NextResponse } from 'next/server';

// API route for getting listing by ID
// Currently not used - listings are accessed directly via metadataUrl query param
// Future: Could implement IPFS-based index to list all listings
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const metadataUrl = searchParams.get('meta');

  if (!metadataUrl) {
    return NextResponse.json(
      { error: "No metadata URL provided. Use ?meta=<ipfs-url>" },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(metadataUrl);
    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch metadata from IPFS" },
        { status: 404 }
      );
    }
    const metadata = await response.json();

    return NextResponse.json({
      id,
      seller: metadata.seller,
      metadataURI: metadataUrl,
      price: metadata.price,
      isOrbVerified: metadata.isOrbVerified,
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch listing" },
      { status: 500 }
    );
  }
}
