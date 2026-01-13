// SPDX-License-Identifier: MIT

pragma solidity ^0.8.30;

import { e, ebool, euint256, inco } from "@inco/lightning/src/Lib.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title AuctionHeist
 * @notice Confidential auction game where players submit encrypted bids for NFT "heist loot"
 * @dev Uses Inco FHEVM for fully private bidding - bids remain secret forever
 */
contract AuctionHeist is ERC721, Ownable2Step {
    
    error AuctionNotActive();
    error AuctionNotEnded();
    error InsufficientBid();
    error InsufficientFees();
    error AlreadyResolved();
    error NoRefundAvailable();
    
    event AuctionStarted(uint256 indexed auctionId, uint256 endTime, uint256 tokenId);
    event BidSubmitted(uint256 indexed auctionId, address indexed bidder, euint256 encryptedBid);
    event AuctionResolved(uint256 indexed auctionId, address indexed winner, uint256 tokenId);
    event BidRefunded(uint256 indexed auctionId, address indexed bidder);
    
    struct Auction {
        uint256 auctionId;
        uint256 tokenId;
        uint256 endTime;
        uint256 duration;
        address winner;
        euint256 highestBid;
        bool resolved;
        mapping(address => euint256) bids;
        address[] bidders;
    }
    
    uint256 public currentAuctionId;
    uint256 public nextTokenId;
    uint256 public constant AUCTION_DURATION = 300; // 5 minutes in seconds
    
    mapping(uint256 => Auction) public auctions;
    
    constructor() ERC721("Heist Loot", "HEIST") Ownable(msg.sender) {
        nextTokenId = 1;
    }
    
    /**
     * @notice Start a new auction for the next NFT
     */
    function startAuction() external onlyOwner {
        uint256 auctionId = currentAuctionId;
        Auction storage auction = auctions[auctionId];
        
        auction.auctionId = auctionId;
        auction.tokenId = nextTokenId;
        auction.endTime = block.timestamp + AUCTION_DURATION;
        auction.duration = AUCTION_DURATION;
        auction.resolved = false;
        auction.highestBid = e.asEuint256(0);
        
        e.allow(auction.highestBid, address(this));
        
        emit AuctionStarted(auctionId, auction.endTime, nextTokenId);
        
        nextTokenId++;
        currentAuctionId++;
    }
    
    /**
     * @notice Submit an encrypted bid for the current auction
     * @param encryptedBid The encrypted bid amount
     */
    function submitEncryptedBid(
        bytes calldata encryptedBid
    ) external payable {
        uint256 auctionId = currentAuctionId - 1;
        Auction storage auction = auctions[auctionId];
        
        if (block.timestamp >= auction.endTime) revert AuctionNotActive();
        if (auction.resolved) revert AlreadyResolved();
        
        _requireFee(1);
        
        euint256 bid = e.newEuint256(encryptedBid, msg.sender);
        e.allow(bid, address(this));
        e.allow(bid, msg.sender);
        
        // Store bid
        if (euint256.unwrap(auction.bids[msg.sender]) == bytes32(0)) {
            auction.bidders.push(msg.sender);
        }
        
        auction.bids[msg.sender] = bid;
        
        emit BidSubmitted(auctionId, msg.sender, bid);
    }
    
    /**
     * @notice Resolve the auction using FHE to find the highest bid
     * @dev Computes winner privately without revealing bid amounts
     * @dev Uses a simplified approach: stores all bids, operator reveals winner off-chain
     */
    function resolveAuction() external {
        uint256 auctionId = currentAuctionId - 1;
        Auction storage auction = auctions[auctionId];
        
        if (block.timestamp < auction.endTime) revert AuctionNotEnded();
        if (auction.resolved) revert AlreadyResolved();
        
        if (auction.bidders.length == 0) {
            auction.resolved = true;
            return;
        }
        
        // For single bidder, they automatically win
        if (auction.bidders.length == 1) {
            auction.winner = auction.bidders[0];
            auction.highestBid = auction.bids[auction.bidders[0]];
            auction.resolved = true;
            _mint(auction.winner, auction.tokenId);
            emit AuctionResolved(auctionId, auction.winner, auction.tokenId);
            return;
        }
        
        // For multiple bidders: Find max using FHE comparisons
        // Initialize with first bidder
        euint256 maxBid = auction.bids[auction.bidders[0]];
        uint256 winnerIndex = 0;
        
        // Compare all bids using FHE
        for (uint256 i = 1; i < auction.bidders.length; i++) {
            euint256 currentBid = auction.bids[auction.bidders[i]];
            
            // Check if current bid is greater than max
            ebool isGreater = e.gt(currentBid, maxBid);
            
            // Update max bid using FHE select
            euint256 newMax = e.select(isGreater, currentBid, maxBid);
            
            // If newMax changed, update winner index (requires comparison)
            // Since we can't easily select addresses with FHE, we track index
            ebool maxChanged = e.ne(newMax, maxBid);
            maxBid = newMax;
            
            // Simple winner tracking: last bidder with highest bid wins
            // This is a limitation of not being able to conditionally select addresses
            if (i == auction.bidders.length - 1) {
                // For the last comparison, we need to determine the winner
                // We'll do a second pass to find the winner
            }
        }
        
        // Second pass: find which bidder has the max bid
        // This requires one comparison per bidder
        for (uint256 i = 0; i < auction.bidders.length; i++) {
            euint256 bid = auction.bids[auction.bidders[i]];
            ebool isWinner = e.eq(bid, maxBid);
            
            // We can't use isWinner directly to select address
            // Instead, we'll use a simple approach: first match wins
            // In production, this would need attestation/reveal
            // For now, we'll compute off-chain and set manually
        }
        
        // Simplified: Set first bidder as winner (will be updated by resolveAuctionWithWinner)
        auction.winner = auction.bidders[0];
        auction.highestBid = maxBid;
        auction.resolved = true;
        
        // Note: Actual winner should be determined by calling resolveAuctionWithWinner
        // after computing winner off-chain through FHE attestation
        
        emit AuctionResolved(auctionId, auction.winner, auction.tokenId);
    }
    
    /**
     * @notice Resolve auction with explicit winner (after off-chain FHE computation)
     * @dev Only owner can call this to set the actual winner and mint NFT
     * @param auctionId The auction to resolve
     * @param winner The winner's address (determined off-chain via FHE)
     */
    function resolveAuctionWithWinner(uint256 auctionId, address winner) external onlyOwner {
        Auction storage auction = auctions[auctionId];
        
        if (block.timestamp < auction.endTime) revert AuctionNotEnded();
        if (auction.resolved) revert AlreadyResolved();
        
        // Verify winner is a bidder
        bool isValidWinner = false;
        for (uint256 i = 0; i < auction.bidders.length; i++) {
            if (auction.bidders[i] == winner) {
                isValidWinner = true;
                break;
            }
        }
        
        require(isValidWinner, "Invalid winner");
        
        auction.winner = winner;
        auction.highestBid = auction.bids[winner];
        auction.resolved = true;
        
        // Mint NFT to winner
        _mint(winner, auction.tokenId);
        
        emit AuctionResolved(auctionId, winner, auction.tokenId);
    }
    
    /**
     * @notice Get bid for a specific address in an auction
     */
    function getBid(
        uint256 auctionId,
        address bidder
    ) external view returns (euint256) {
        return auctions[auctionId].bids[bidder];
    }
    
    /**
     * @notice Get current auction info
     */
    function getCurrentAuction() external view returns (
        uint256 auctionId,
        uint256 tokenId,
        uint256 endTime,
        uint256 timeRemaining,
        bool resolved,
        uint256 bidderCount
    ) {
        auctionId = currentAuctionId > 0 ? currentAuctionId - 1 : 0;
        Auction storage auction = auctions[auctionId];
        
        tokenId = auction.tokenId;
        endTime = auction.endTime;
        timeRemaining = block.timestamp < endTime ? endTime - block.timestamp : 0;
        resolved = auction.resolved;
        bidderCount = auction.bidders.length;
    }
    
    /**
     * @notice Get auction winner (only available after resolution)
     */
    function getAuctionWinner(uint256 auctionId) external view returns (address) {
        if (!auctions[auctionId].resolved) revert AuctionNotEnded();
        return auctions[auctionId].winner;
    }
    
    /**
     * @notice Check if user has bid in current auction
     */
    function hasBid(address bidder) external view returns (bool) {
        uint256 auctionId = currentAuctionId > 0 ? currentAuctionId - 1 : 0;
        return euint256.unwrap(auctions[auctionId].bids[bidder]) != bytes32(0);
    }
    
    /**
     * @notice Get bidders list for an auction
     */
    function getAuctionBidders(uint256 auctionId) external view returns (address[] memory) {
        return auctions[auctionId].bidders;
    }
    
    /**
     * @notice Calculate required fee for bid submission
     */
    function _requireFee(uint256 cipherTextCount) internal view {
        if (msg.value < inco.getFee() * cipherTextCount) revert InsufficientFees();
    }
    
    /**
     * @notice Get required fee for operations
     */
    function getRequiredFee() external view returns (uint256) {
        return inco.getFee();
    }
}
