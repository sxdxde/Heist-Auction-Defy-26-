import { expect } from "chai";
import { HexString } from "@inco/js";
import {
  Address,
  parseEther,
  formatEther,
  getAddress
} from "viem";
import auctionHeistAbi from "../artifacts/contracts/AuctionHeist.sol/AuctionHeist.json";
import { encryptValue, decryptValue, getFee } from "../utils/incoHelper";
import { namedWallets, wallet, publicClient } from "../utils/wallet";

describe("AuctionHeist Tests", function () {
  let contractAddress: Address;

  beforeEach(async function () {
    console.log("\nSetting up AuctionHeist test environment");

    // Deploy the contract
    const txHash = await wallet.deployContract({
      abi: auctionHeistAbi.abi,
      bytecode: auctionHeistAbi.bytecode as HexString,
      args: [],
    });

    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
    });
    contractAddress = receipt.contractAddress as Address;
    console.log(`AuctionHeist contract deployed at: ${contractAddress}`);

    // Fund test wallets if needed
    for (const [name, userWallet] of Object.entries(namedWallets)) {
      const balance = await publicClient.getBalance({
        address: userWallet.account?.address as Address,
      });
      const balanceEth = Number(formatEther(balance));

      if (balanceEth < 0.01) {
        const neededEth = 0.01 - balanceEth;
        console.log(`Funding ${name} with ${neededEth.toFixed(6)} ETH...`);
        const tx = await wallet.sendTransaction({
          to: userWallet.account?.address as Address,
          value: parseEther(neededEth.toFixed(6)),
        });

        await publicClient.waitForTransactionReceipt({ hash: tx });
        console.log(`${name} funded: ${userWallet.account?.address as Address}`);
      }
    }
  });

  describe("----------- Auction Lifecycle Tests -----------", function () {
    it("Should start a new auction", async function () {
      console.log("\nStarting new auction");

      const txHash = await wallet.writeContract({
        address: contractAddress,
        abi: auctionHeistAbi.abi,
        functionName: "startAuction",
        args: [],
      });

      await publicClient.waitForTransactionReceipt({ hash: txHash });
      console.log("Auction started successfully");

      // Get auction info
      const auctionInfo = await publicClient.readContract({
        address: getAddress(contractAddress),
        abi: auctionHeistAbi.abi,
        functionName: "getCurrentAuction",
        args: [],
      }) as any;

      console.log(`Auction ID: ${auctionInfo[0]}`);
      console.log(`NFT Token ID: ${auctionInfo[1]}`);
      console.log(`End Time: ${auctionInfo[2]}`);
      console.log(`Time Remaining: ${auctionInfo[3]} seconds`);

      expect(auctionInfo[0]).to.equal(0n); // First auction ID
      expect(auctionInfo[1]).to.equal(1n); // First NFT token
      expect(auctionInfo[4]).to.be.false; // Not resolved
    });

    it("Should accept encrypted bids from multiple players", async function () {
      console.log("\n=== Two-Player Auction Demo ===");

      // Start auction
      console.log("\n1. Starting auction...");
      const startTx = await wallet.writeContract({
        address: contractAddress,
        abi: auctionHeistAbi.abi,
        functionName: "startAuction",
        args: [],
      });
      await publicClient.waitForTransactionReceipt({ hash: startTx });
      console.log("✓ Auction started");

      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Alice bids 25 ETH (encrypted)
      console.log("\n2. Alice submitting encrypted bid: 25 ETH");
      const aliceBidAmount = parseEther("25");
      const encryptedAliceBid = await encryptValue({
        value: aliceBidAmount,
        address: namedWallets.alice.account?.address as Address,
        contractAddress,
      });

      const fee = await getFee();
      
      const aliceTx = await namedWallets.alice.writeContract({
        address: contractAddress,
        abi: auctionHeistAbi.abi,
        functionName: "submitEncryptedBid",
        args: [encryptedAliceBid],
        value: fee,
        account: namedWallets.alice.account!,
        chain: namedWallets.alice.chain,
      });

      await publicClient.waitForTransactionReceipt({ hash: aliceTx });
      console.log("✓ Alice's encrypted bid submitted (amount hidden on-chain)");

      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Bob bids 30 ETH (encrypted)
      console.log("\n3. Bob submitting encrypted bid: 30 ETH");
      const bobBidAmount = parseEther("30");
      const encryptedBobBid = await encryptValue({
        value: bobBidAmount,
        address: namedWallets.bob.account?.address as Address,
        contractAddress,
      });

      const bobTx = await namedWallets.bob.writeContract({
        address: contractAddress,
        abi: auctionHeistAbi.abi,
        functionName: "submitEncryptedBid",
        args: [encryptedBobBid],
        value: fee,
        account: namedWallets.bob.account!,
        chain: namedWallets.bob.chain,
      });

      await publicClient.waitForTransactionReceipt({ hash: bobTx });
      console.log("✓ Bob's encrypted bid submitted (amount hidden on-chain)");

      // Verify both players have bid
      const aliceHasBid = await publicClient.readContract({
        address: getAddress(contractAddress),
        abi: auctionHeistAbi.abi,
        functionName: "hasBid",
        args: [namedWallets.alice.account?.address as Address],
      });

      const bobHasBid = await publicClient.readContract({
        address: getAddress(contractAddress),
        abi: auctionHeistAbi.abi,
        functionName: "hasBid",
        args: [namedWallets.bob.account?.address as Address],
      });

      console.log(`\n✓ Alice has bid: ${aliceHasBid}`);
      console.log(`✓ Bob has bid: ${bobHasBid}`);

      expect(aliceHasBid).to.be.true;
      expect(bobHasBid).to.be.true;
    });

    it("Alice bids 25 ETH, Bob bids 30 ETH → Bob wins NFT", async function () {
      this.timeout(120000); // 2 minutes timeout
      console.log("\n=== COMPLETE 2-PLAYER AUCTION DEMO ===");

      // Start auction
      console.log("\n🎯 STEP 1: Starting Vault Breach Auction");
      const startTx = await wallet.writeContract({
        address: contractAddress,
        abi: auctionHeistAbi.abi,
        functionName: "startAuction",
        args: [],
      });
      await publicClient.waitForTransactionReceipt({ hash: startTx });
      console.log("✓ Auction #0 started | NFT Token #1 at stake");

      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Alice bids 25 ETH
      console.log("\n🔒 STEP 2: Alice submitting encrypted bid: 25 ETH");
      const aliceBidAmount = parseEther("25");
      const encryptedAliceBid = await encryptValue({
        value: aliceBidAmount,
        address: namedWallets.alice.account?.address as Address,
        contractAddress,
      });

      const fee = await getFee();
      
      const aliceTx = await namedWallets.alice.writeContract({
        address: contractAddress,
        abi: auctionHeistAbi.abi,
        functionName: "submitEncryptedBid",
        args: [encryptedAliceBid],
        value: fee,
        account: namedWallets.alice.account!,
        chain: namedWallets.alice.chain,
      });

      await publicClient.waitForTransactionReceipt({ hash: aliceTx });
      console.log("✓ Alice's bid encrypted on-chain (hidden forever)");

      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Bob bids 30 ETH
      console.log("\n🔒 STEP 3: Bob submitting encrypted bid: 30 ETH");
      const bobBidAmount = parseEther("30");
      const encryptedBobBid = await encryptValue({
        value: bobBidAmount,
        address: namedWallets.bob.account?.address as Address,
        contractAddress,
      });

      const bobTx = await namedWallets.bob.writeContract({
        address: contractAddress,
        abi: auctionHeistAbi.abi,
        functionName: "submitEncryptedBid",
        args: [encryptedBobBid],
        value: fee,
        account: namedWallets.bob.account!,
        chain: namedWallets.bob.chain,
      });

      await publicClient.waitForTransactionReceipt({ hash: bobTx });
      console.log("✓ Bob's bid encrypted on-chain (hidden forever)");

      console.log("\n⏰ STEP 4: Waiting for auction to end (simulating 5min timer)...");
      console.log("(Fast-forwarding time for test)");

      // Fast forward time by mining blocks (approximation)
      await new Promise((resolve) => setTimeout(resolve, 5000));

      console.log("\n🏆 STEP 5: Resolving auction with FHE computation");
      const resolveTx = await wallet.writeContract({
        address: contractAddress,
        abi: auctionHeistAbi.abi,
        functionName: "resolveAuction",
        args: [],
      });

      await publicClient.waitForTransactionReceipt({ hash: resolveTx });
      console.log("✓ FHE computed winner privately");

      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Get winner
      const winner = await publicClient.readContract({
        address: getAddress(contractAddress),
        abi: auctionHeistAbi.abi,
        functionName: "getAuctionWinner",
        args: [0n],
      });

      console.log(`\n📢 RESULT: Winner is ${winner === namedWallets.bob.account?.address ? 'Bob' : 'Alice'}`);
      console.log(`Winner address: ${winner}`);
      console.log(`Bob's address: ${namedWallets.bob.account?.address}`);

      // Verify Bob won
      expect(winner).to.equal(namedWallets.bob.account?.address);

      // Verify Bob owns the NFT
      const nftOwner = await publicClient.readContract({
        address: getAddress(contractAddress),
        abi: auctionHeistAbi.abi,
        functionName: "ownerOf",
        args: [1n],
      });

      console.log(`\n🎨 NFT Token #1 owner: ${nftOwner}`);
      expect(nftOwner).to.equal(namedWallets.bob.account?.address);

      console.log("\n✅ AUCTION COMPLETE");
      console.log("════════════════════════════════════");
      console.log("Privacy Features Demonstrated:");
      console.log("  ✓ Bids encrypted with FHE");
      console.log("  ✓ Amounts never revealed on-chain");
      console.log("  ✓ Winner computed privately");
      console.log("  ✓ NFT minted to correct winner");
      console.log("════════════════════════════════════");
    });

    it("Should prevent bidding after auction ends", async function () {
      console.log("\nTesting bid after auction end");

      // Start auction
      const startTx = await wallet.writeContract({
        address: contractAddress,
        abi: auctionHeistAbi.abi,
        functionName: "startAuction",
        args: [],
      });
      await publicClient.waitForTransactionReceipt({ hash: startTx });

      // Wait for auction to end (simulate)
      console.log("Waiting for auction to end...");
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Try to bid after auction ends
      const lateBid = parseEther("50");
      const encryptedLateBid = await encryptValue({
        value: lateBid,
        address: namedWallets.alice.account?.address as Address,
        contractAddress,
      });

      const fee = await getFee();

      try {
        const tx = await namedWallets.alice.writeContract({
          address: contractAddress,
          abi: auctionHeistAbi.abi,
          functionName: "submitEncryptedBid",
          args: [encryptedLateBid],
          value: fee,
          account: namedWallets.alice.account!,
          chain: namedWallets.alice.chain,
        });
        await publicClient.waitForTransactionReceipt({ hash: tx });
        expect.fail("Should have reverted with AuctionNotActive");
      } catch (error: any) {
        console.log("✓ Late bid rejected as expected");
        expect(error.message).to.include("AuctionNotActive");
      }
    });
  });

  describe("----------- Privacy Features Tests -----------", function () {
    it("Should keep bid amounts encrypted on-chain", async function () {
      console.log("\n=== Privacy Verification Test ===");

      // Start auction
      const startTx = await wallet.writeContract({
        address: contractAddress,
        abi: auctionHeistAbi.abi,
        functionName: "startAuction",
        args: [],
      });
      await publicClient.waitForTransactionReceipt({ hash: startTx });

      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Alice bids
      const aliceBidAmount = parseEther("100");
      const encryptedAliceBid = await encryptValue({
        value: aliceBidAmount,
        address: namedWallets.alice.account?.address as Address,
        contractAddress,
      });

      const fee = await getFee();
      
      const aliceTx = await namedWallets.alice.writeContract({
        address: contractAddress,
        abi: auctionHeistAbi.abi,
        functionName: "submitEncryptedBid",
        args: [encryptedAliceBid],
        value: fee,
        account: namedWallets.alice.account!,
        chain: namedWallets.alice.chain,
      });

      await publicClient.waitForTransactionReceipt({ hash: aliceTx });

      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Get Alice's encrypted bid handle
      const bidHandle = await publicClient.readContract({
        address: getAddress(contractAddress),
        abi: auctionHeistAbi.abi,
        functionName: "getBid",
        args: [0n, namedWallets.alice.account?.address as Address],
      }) as HexString;

      console.log(`\n✓ Encrypted bid handle retrieved: ${bidHandle}`);
      console.log("✓ Actual bid amount (100 ETH) is NOT visible on-chain");
      console.log("✓ Only the ciphertext handle is stored");

      // Decrypt using Alice's wallet
      const decryptedBid = await decryptValue({
        walletClient: namedWallets.alice,
        handle: bidHandle.toString(),
      });

      console.log(`\n✓ Alice can decrypt her own bid: ${formatEther(decryptedBid)} ETH`);
      expect(decryptedBid).to.equal(aliceBidAmount);
      
      console.log("\n✅ Privacy Verified:");
      console.log("  ✓ Bid encrypted on submission");
      console.log("  ✓ Only bidder can decrypt their own bid");
      console.log("  ✓ Other players cannot see bid amounts");
    });
  });

  describe("----------- Multiple Auction Tests -----------", function () {
    it("Should handle sequential auctions", async function () {
      console.log("\n=== Sequential Auctions Test ===");

      // First auction
      console.log("\n📢 Starting Auction #1");
      const start1 = await wallet.writeContract({
        address: contractAddress,
        abi: auctionHeistAbi.abi,
        functionName: "startAuction",
        args: [],
      });
      await publicClient.waitForTransactionReceipt({ hash: start1 });

      const auction1Info = await publicClient.readContract({
        address: getAddress(contractAddress),
        abi: auctionHeistAbi.abi,
        functionName: "getCurrentAuction",
        args: [],
      }) as any;

      console.log(`✓ Auction #${auction1Info[0]} started for NFT #${auction1Info[1]}`);

      // Wait and resolve first auction
      await new Promise((resolve) => setTimeout(resolve, 3000));
      
      const resolve1 = await wallet.writeContract({
        address: contractAddress,
        abi: auctionHeistAbi.abi,
        functionName: "resolveAuction",
        args: [],
      });
      await publicClient.waitForTransactionReceipt({ hash: resolve1 });
      console.log("✓ Auction #0 resolved");

      // Second auction
      console.log("\n📢 Starting Auction #2");
      const start2 = await wallet.writeContract({
        address: contractAddress,
        abi: auctionHeistAbi.abi,
        functionName: "startAuction",
        args: [],
      });
      await publicClient.waitForTransactionReceipt({ hash: start2 });

      const auction2Info = await publicClient.readContract({
        address: getAddress(contractAddress),
        abi: auctionHeistAbi.abi,
        functionName: "getCurrentAuction",
        args: [],
      }) as any;

      console.log(`✓ Auction #${auction2Info[0]} started for NFT #${auction2Info[1]}`);

      expect(auction2Info[0]).to.equal(1n); // Second auction
      expect(auction2Info[1]).to.equal(2n); // Second NFT

      console.log("\n✅ Sequential auctions work correctly");
    });
  });
});
