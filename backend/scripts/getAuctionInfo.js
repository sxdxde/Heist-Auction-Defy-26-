const hre = require("hardhat");

async function main() {
    const contractAddress = process.env.AUCTION_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";

    if (contractAddress === "0x0000000000000000000000000000000000000000") {
        console.error("❌ Please set AUCTION_CONTRACT_ADDRESS in your .env file");
        process.exit(1);
    }

    console.log("📊 Auction Information\n");

    const auction = await hre.viem.getContractAt("AuctionHeist", contractAddress);

    // Get current auction
    const info = await auction.read.getCurrentAuction();
    const auctionId = info[0];
    const tokenId = info[1];
    const endTime = info[2];
    const timeRemaining = info[3];
    const resolved = info[4];
    const bidderCount = info[5];

    console.log("═══════════════════════════════════");
    console.log("CURRENT AUCTION");
    console.log("═══════════════════════════════════");
    console.log(`Auction ID: #${auctionId}`);
    console.log(`Prize NFT: Heist Loot #${tokenId}`);
    console.log(`Status: ${resolved ? '🟡 RESOLVED' : timeRemaining > 0 ? '🟢 ACTIVE' : '🔴 ENDED'}`);
    console.log(`Time Remaining: ${timeRemaining}s (${Math.floor(Number(timeRemaining) / 60)}m ${Number(timeRemaining) % 60}s)`);
    console.log(`End Time: ${new Date(Number(endTime) * 1000).toLocaleString()}`);
    console.log(`Total Bidders: ${bidderCount}`);

    // Get bidders
    if (Number(bidderCount) > 0) {
        console.log("\n📋 BIDDERS:");
        const bidders = await auction.read.getAuctionBidders([auctionId]);
        bidders.forEach((bidder, i) => {
            console.log(`  ${i + 1}. ${bidder}`);
        });
    } else {
        console.log("\n📋 No bids placed yet");
    }

    // Get winner if resolved
    if (resolved) {
        try {
            const winner = await auction.read.getAuctionWinner([auctionId]);
            console.log("\n🏆 WINNER:");
            console.log(`  ${winner}`);

            // Check NFT ownership
            try {
                const nftOwner = await auction.read.ownerOf([tokenId]);
                console.log(`\n🎨 NFT Owner (verified):`);
                console.log(`  ${nftOwner}`);
                console.log(`  ✅ Matches winner: ${nftOwner.toLowerCase() === winner.toLowerCase()}`);
            } catch (e) {
                console.log("\n⚠️  NFT not yet minted");
            }
        } catch (error) {
            console.log("\n⚠️  No winner (auction resolved with no bids)");
        }
    }

    console.log("\n═══════════════════════════════════");
    console.log("CONTRACT INFO");
    console.log("═══════════════════════════════════");
    console.log(`Address: ${contractAddress}`);
    console.log(`Owner: ${await auction.read.owner()}`);
    console.log(`Next Token ID: ${await auction.read.nextTokenId()}`);
    console.log(`Current Auction ID: ${await auction.read.currentAuctionId()}`);

    console.log("\n🔗 View on Explorer:");
    console.log(`https://sepolia.basescan.org/address/${contractAddress}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Error:", error.message);
        process.exit(1);
    });
