// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title TruCheqRegistry
 * @dev A simple registry to index TruCheq deals on-chain.
 * Settlement is handled off-chain via Cronos x402 Facilitator (EIP-3009).
 */
contract TruCheqRegistry {
    struct Deal {
        address seller;
        uint256 price; // In USDC (atomic units, usually 6 decimals)
        string metadataCid; // IPFS CID for images/description
        uint256 createdAt;
    }

    mapping(uint256 => Deal) public deals;
    uint256 public nextDealId;

    event DealCreated(uint256 indexed dealId, address indexed seller, uint256 price, string metadataCid);

    function createDeal(uint256 _price, string memory _metadataCid) external returns (uint256) {
        deals[nextDealId] = Deal({
            seller: msg.sender,
            price: _price,
            metadataCid: _metadataCid,
            createdAt: block.timestamp
        });

        emit DealCreated(nextDealId, msg.sender, _price, _metadataCid);
        
        return nextDealId++;
    }
}