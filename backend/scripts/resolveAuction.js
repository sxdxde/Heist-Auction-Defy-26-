const { ethers } = require("hardhat");

async function main() {
    const contractAddress = process.env.AUCTION_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";

    if (contractAddress === "0x0000000000000000000000000000000000000000") {
        console.error("❌ Please set AUCTION_CONTRACT_ADDRESS in your .env file");
        process.exit(1);
    }

    console.log("🏆 Resolving Auction...\n");

    const auction = await ethers.getContractAt("AuctionHeist", contractAddress);

    // Get current auction info
    const info = await auction.getCurrentAuction();
    const auctionId = info[0];
    const endTime = info[2];
    const timeRemaining = info[3];
    const resolved = info[4];
    const bidderCount = info[5];

    console.log("Current Auction Status:");
    console.log(`Auction ID: #${auctionId}`);
    console.log(`Bidders: ${bidderCount}`);
    console.log(`Time Remaining: ${timeRemaining}s`);
    console.log(`Resolved: ${resolved}`);

    if (resolved) {
        console.error("\n❌ Error: Auction already resolved");

        // Show winner
        try {
            const winner = await auction.getAuctionWinner(auctionId);
            console.log(`Winner: ${winner}`);
        } catch (e) {
            console.log("Could not fetch winner");
        }

        process.exit(1);
    }

    if (Number(timeRemaining) > 0) {
        console.warn(`\n⚠️  Warning: Auction still has ${timeRemaining}s remaining`);
        console.warn(`Ends at: ${new Date(Number(endTime) * 1000).toLocaleString()}`);
        console.log("\nProceeding anyway...");
    }

    if (Number(bidderCount) === 0) {
        console.warn("\n⚠️  Warning: No bids placed in this auction");
        console.log("Proceeding anyway (will resolve with no winner)...");
    }

    // Resolve auction
    console.log("\n📡 Sending resolution transaction...");
    const tx = await auction.resolveAuction();
    console.log(`Transaction hash: ${tx.hash}`);

    console.log("⏳ Waiting for FHE computation...");
    const receipt = await tx.wait();

    console.log("\n✅ Auction Resolved Successfully!\n");

    // Get winner
    try {
        const winner = await auction.getAuctionWinner(auctionId);

        console.log("═══════════════════════════════════");
        console.log(`🏆 WINNER: ${winner}`);
        console.log(`🎨 NFT Minted: Heist Loot #${info[1]}`);
        console.log("═══════════════════════════════════");

        // Get bidders list
        const bidders = await auction.getAuctionBidders(auctionId);
        console.log(`\nTotal Participants: ${bidders.length}`);
        console.log("Bidders:");
        bidders.forEach((bidder, i) => {
            const isWinner = bidder.toLowerCase() === winner.toLowerCase();
            console.log(`  ${i + 1}. ${bidder} ${isWinner ? '🏆' : '❌'}`);
        });

        console.log("\n🔐 Privacy Note: All bid amounts remain encrypted forever!");

    } catch (error) {
        console.log("\n📝 Auction resolved with no winner (no bids placed)");
    }

    console.log("\n🎯 Ready to start next auction!");
}

async function main() {
    const contractAddress = process.env.AUCTION_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";

    if (contractAddress === "0x0000000000000000000000000000000000000000") {
        console.error("❌ Please set AUCTION_CONTRACT_ADDRESS in your .env file");
        process.exit(1);
    }

    console.log("🏆 Resolving Auction...\n");

    const auction = await hre.ethers.getContractAt("AuctionHeist", contractAddress);

    // Get current auction info
    const info = await auction.getCurrentAuction();
    const auctionId = info[0];
    const endTime = info[2];
    const timeRemaining = info[3];
    const resolved = info[4];
    const bidderCount = info[5];

    console.log("Current Auction Status:");
    console.log(`Auction ID: #${auctionId}`);
    console.log(`Bidders: ${bidderCount}`);
    console.log(`Time Remaining: ${timeRemaining}s`);
    console.log(`Resolved: ${resolved}`);

    if (resolved) {
        console.error("\n❌ Error: Auction already resolved");

        // Show winner
        try {
            const winner = await auction.getAuctionWinner(auctionId);
            console.log(`Winner: ${winner}`);
        } catch (e) {
            console.log("Could not fetch winner");
        }

        process.exit(1);
    }

    if (Number(timeRemaining) > 0) {
        console.warn(`\n⚠️  Warning: Auction still has ${timeRemaining}s remaining`);
        console.warn(`Ends at: ${new Date(Number(endTime) * 1000).toLocaleString()}`);
        console.log("\nProceeding anyway...");
    }

    if (Number(bidderCount) === 0) {
        console.warn("\n⚠️  Warning: No bids placed in this auction");
        console.log("Proceeding anyway (will resolve with no winner)...");
    }

    // Resolve auction
    console.log("\n📡 Sending resolution transaction...");
    const tx = await auction.resolveAuction();
    console.log(`Transaction hash: ${tx.hash}`);

    console.log("⏳ Waiting for FHE computation...");
    const receipt = await tx.wait();

    console.log("\n✅ Auction Resolved Successfully!\n");

    // Get winner
    try {
        const winner = await auction.getAuctionWinner(auctionId);

        console.log("═══════════════════════════════════");
        console.log(`🏆 WINNER: ${winner}`);
        console.log(`🎨 NFT Minted: Heist Loot #${info[1]}`);
        console.log("═══════════════════════════════════");

        // Get bidders list
        const bidders = await auction.getAuctionBidders(auctionId);
        console.log(`\nTotal Participants: ${bidders.length}`);
        console.log("Bidders:");
        bidders.forEach((bidder, i) => {
            const isWinner = bidder.toLowerCase() === winner.toLowerCase();
            console.log(`  ${i + 1}. ${bidder} ${isWinner ? '🏆' : '❌'}`);
        });

        console.log("\n🔐 Privacy Note: All bid amounts remain encrypted forever!");

    } catch (error) {
        console.log("\n📝 Auction resolved with no winner (no bids placed)");
    }

    console.log("\n🎯 Ready to start next auction!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Error:", error.message);
        process.exit(1);
    });
