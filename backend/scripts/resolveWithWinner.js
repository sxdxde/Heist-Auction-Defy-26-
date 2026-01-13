const { ethers } = require("hardhat");

async function main() {
    const contractAddress = process.env.AUCTION_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";

    if (contractAddress === "0x0000000000000000000000000000000000000000") {
        console.error("❌ Please set AUCTION_CONTRACT_ADDRESS in your .env file");
        process.exit(1);
    }

    const auctionIdToResolve = process.argv[2] || "0";
    const winnerAddress = process.argv[3];

    if (!winnerAddress) {
        console.error("\n❌ Usage: npx hardhat run scripts/resolveWithWinner.js --network baseSepolia AUCTION_ID WINNER_ADDRESS");
        console.error("Example: npx hardhat run scripts/resolveWithWinner.js --network baseSepolia 0 0x1234...");
        process.exit(1);
    }

    console.log("🏆 Resolving Auction with Known Winner...\n");

    const auction = await ethers.getContractAt("AuctionHeist", contractAddress);

    // Verify inputs
    const [signer] = await ethers.getSigners();
    const owner = await auction.owner();

    if (owner.toLowerCase() !== signer.address.toLowerCase()) {
        console.error("\n❌ Error: Only the contract owner can resolve with winner");
        console.error(`Owner: ${owner}`);
        console.error(`Your address: ${signer.address}`);
        process.exit(1);
    }

    console.log(`Auction ID: #${auctionIdToResolve}`);
    console.log(`Winner: ${winnerAddress}\n`);

    // Resolve with winner
    console.log("📡 Sending transaction...");
    const tx = await auction.resolveAuctionWithWinner(auctionIdToResolve, winnerAddress);
    console.log(`Transaction hash: ${tx.hash}`);

    console.log("⏳ Waiting for confirmation...");
    await tx.wait();

    console.log("\n✅ Auction Resolved Successfully!\n");

    console.log("═══════════════════════════════════");
    console.log(`🏆 WINNER: ${winnerAddress}`);
    console.log("🎨 NFT has been minted to winner");
    console.log("═══════════════════════════════════");

    // Get bidders
    const bidders = await auction.getAuctionBidders(auctionIdToResolve);
    console.log(`\nTotal Participants: ${bidders.length}`);
    console.log("Bidders:");
    bidders.forEach((bidder, i) => {
        const isWinner = bidder.toLowerCase() === winnerAddress.toLowerCase();
        console.log(`  ${i + 1}. ${bidder} ${isWinner ? '🏆 WINNER' : ''}`);
    });

    console.log("\n🔐 Privacy Note: All bid amounts remain encrypted on-chain!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Error:", error.message);
        process.exit(1);
    });
