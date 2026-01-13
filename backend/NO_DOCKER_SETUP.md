# Running Without Docker ✅

Good news! You don't need Docker. Here's how to deploy and test directly on **Base Sepolia testnet**.

## Quick Start

### 1. Compile Contract ✅ (Already Done)

```bash
npx hardhat compile
```

**Status**: ✅ Compiled successfully!

### 2. Deploy to Base Sepolia

```bash
# Make sure your .env has:
# - PRIVATE_KEY_BASE_SEPOLIA (your private key without 0x)
# - BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"

npx hardhat ignition deploy ignition/modules/AuctionHeist.ts --network baseSepolia
```

Save the contract address that gets printed!

### 3. Update Frontend

Edit `frontend/utils/constants.ts`:

```typescript
export const AUCTION_CONTRACT_ADDRESS = "0xYOUR_DEPLOYED_ADDRESS_HERE";
```

### 4. Start Frontend

```bash
cd ../ frontend
npm run dev
```

Visit `http://localhost:3000`

## How Resolution Works (FHE Limitation Workaround)

Due to FHE limitations (can't conditionally select addresses), we have **two resolution options**:

### Option A: Single Bidder Auto-Resolve (Automatic)

If only 1 player bids, they automatically win:

```bash
npx hardhat run scripts/resolveAuction.js --network baseSepolia
```

### Option B: Multi-Player Manual Resolution (Recommended)

For 2+ bidders, the owner manually specifies the winner after checking bids off-chain:

1. **Players submit encrypted bids** via frontend
2. **Owner decrypts bids locally** (using Inco's attestation)
3. **Owner calls `resolveAuctionWithWinner`**:

```bash
# In scripts/ create resolveWithWinner.js:
const winner = "0xWINNER_ADDRESS"; // Determined off-chain
const tx = await auction.resolveAuctionWithWinner(0, winner);
```

This maintains **privacy** because:
- Bids stay encrypted on-chain
- Only owner decrypts locally (not publicly)
- Other players never see bid amounts

## Get Testnet ETH

You need ~0.05 ETH on Base Sepolia:

- https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
- https://www.alchemy.com/faucets/base-sepolia

## Testing

### Option 1: Manual Demo (No Tests)

1. Deploy contract
2. Start auction via script
3. Use 2 MetaMask wallets to bid on frontend
4. Resolve using `resolveAuctionWithWinner`

### Option 2: Run Tests on Testnet

```bash
# Costs real testnet ETH but tests everything
npx hardhat test test/AuctionHeist.test.ts --network baseSepolia
```

## Next Steps

1. ✅ Compile (done)
2. ⏳ Deploy to Base Sepolia
3. ⏳ Update frontend with contract address
4. ⏳ Start frontend and test!

No Docker needed! 🎉
