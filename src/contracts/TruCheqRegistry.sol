// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title TruCheqRegistry
 * @dev On-chain state layer for TruCheq listings on Base Sepolia.
 *      This contract IS the state layer — no off-chain database needed.
 *      World ID orb verification status is stamped at listing creation time.
 */
contract TruCheqRegistry {
    struct Listing {
        address sellerWallet;
        string metadataURI;     // IPFS link (e.g. ipfs://Qm...)
        uint256 priceUSDC;      // Price in USDC atomic units (6 decimals)
        bool isOrbVerified;     // Stamped from World ID orb verification
        bool isActive;
    }

    mapping(uint256 => Listing) public listings;
    uint256 public nextListingId;

    event ListingCreated(uint256 indexed id, address seller, bool isVerified);
    event ListingCancelled(uint256 indexed id);

    /**
     * @notice Create a new listing on the TruCheq registry.
     * @param _metadataURI  IPFS URI pointing to listing metadata (images, description, etc.)
     * @param _priceUSDC    Price in USDC atomic units (6 decimals)
     * @param _isOrbVerified Whether the seller has been verified via World ID orb scan
     * @return listingId    The ID assigned to the newly created listing
     */
    function createListing(
        string memory _metadataURI,
        uint256 _priceUSDC,
        bool _isOrbVerified
    ) external returns (uint256 listingId) {
        listingId = nextListingId;

        listings[listingId] = Listing({
            sellerWallet: msg.sender,
            metadataURI: _metadataURI,
            priceUSDC: _priceUSDC,
            isOrbVerified: _isOrbVerified,
            isActive: true
        });

        emit ListingCreated(listingId, msg.sender, _isOrbVerified);

        nextListingId++;
    }

    /**
     * @notice Cancel an active listing. Only the original seller can cancel.
     * @param _listingId The ID of the listing to cancel
     */
    function cancelListing(uint256 _listingId) external {
        require(listings[_listingId].sellerWallet == msg.sender, "Only seller can cancel");
        require(listings[_listingId].isActive, "Listing already inactive");

        listings[_listingId].isActive = false;
        emit ListingCancelled(_listingId);
    }
}
