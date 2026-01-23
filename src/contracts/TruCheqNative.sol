// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract TruCheqNative {
    struct Deal {
        address seller;
        address buyer;
        uint256 price; // In Wei (CRO)
        bool isFunded;
        bool isCompleted;
    }

    mapping(uint256 => Deal) public deals;
    uint256 public nextDealId;

    event DealCreated(uint256 indexed dealId, address seller, uint256 price);
    event FundsLocked(uint256 indexed dealId, address buyer, uint256 amount);
    event FundsReleased(uint256 indexed dealId, address seller, uint256 amount);

    // 1. Seller creates the metadata on-chain
    function createDeal(uint256 _price) external returns (uint256) {
        deals[nextDealId] = Deal({
            seller: msg.sender,
            buyer: address(0),
            price: _price,
            isFunded: false,
            isCompleted: false
        });
        emit DealCreated(nextDealId, msg.sender, _price);
        return nextDealId++;
    }

    // 2. Buyer Pledges Native CRO (Payable)
    function pledge(uint256 _dealId) external payable {
        Deal storage deal = deals[_dealId];
        require(msg.value == deal.price, "Wrong CRO amount");
        require(!deal.isFunded, "Already funded");

        deal.buyer = msg.sender;
        deal.isFunded = true;
        
        emit FundsLocked(_dealId, msg.sender, msg.value);
    }

    // 3. Buyer Releases Funds
    function release(uint256 _dealId) external {
        Deal storage deal = deals[_dealId];
        require(msg.sender == deal.buyer, "Only buyer can release");
        require(deal.isFunded, "Not funded");
        require(!deal.isCompleted, "Already completed");

        deal.isCompleted = true;
        
        // Transfer CRO to Seller
        (bool sent, ) = deal.seller.call{value: deal.price}("");
        require(sent, "Failed to send CRO");
        
        emit FundsReleased(_dealId, deal.seller, deal.price);
    }
}
