async function main() {
    // Import ethers from hardhat at runtime
    const hre = await import("hardhat");
    const ethers = hre.ethers;

    const contractAddress = process.env.AUCTION_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";

    if (contractAddress === "0x0000000000000000000000000000000000000000") {
        console.error("❌ Please set AUCTION_CONTRACT_ADDRESS in your .env file");
        process.exit(1);
    }

    console.log("🎯 Starting new Vault Breach Auction...\n");

    const auction = await ethers.getContractAt("AuctionHeist", contractAddress);

    // Check current owner
    const owner = await auction.owner();
    const [signer] = await ethers.getSigners();

    console.log(`Contract Owner: ${owner}`);
    console.log(`Your Address: ${signer.address}`);

    if (owner.toLowerCase() !== signer.address.toLowerCase()) {
        console.error("\n❌ Error: Only the contract owner can start auctions");
        process.exit(1);
    }

    // Start auction
    console.log("\n📡 Sending transaction...");
    const tx = await auction.startAuction();
    console.log(`Transaction hash: ${tx.hash}`);

    console.log("⏳ Waiting for confirmation...");
    await tx.wait();

    console.log("\n✅ Auction Started Successfully!\n");

    // Get auction info
    const info = await auction.getCurrentAuction();
    const auctionId = info[0];
    const tokenId = info[1];
    const endTime = info[2];
    const timeRemaining = info[3];

    console.log("═══════════════════════════════════");
    console.log(`Auction ID: #${auctionId}`);
    console.log(`NFT Prize: Heist Loot #${tokenId}`);
    console.log(`End Time: ${new Date(Number(endTime) * 1000).toLocaleString()}`);
    console.log(`Duration: ${timeRemaining} seconds (${Math.floor(Number(timeRemaining) / 60)} minutes)`);
    console.log("═══════════════════════════════════");

    console.log("\n🔥 Auction is now LIVE!");
    console.log("🎮 Players can submit encrypted bids via the frontend");
    console.log(`⏰ Auction will auto-end at: ${new Date(Number(endTime) * 1000).toLocaleTimeString()}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Error:", error.message);
        process.exit(1);
    });
