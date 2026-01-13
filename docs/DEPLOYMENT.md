# Deployment Guide - Confidential Auction Heists

## 🚀 Pre-Deployment Checklist

- [ ] Node.js v18+ installed
- [ ] MetaMask wallet configured
- [ ] Base Sepolia RPC URL obtained
- [ ] Funded wallet with Base Sepolia ETH (0.1+ ETH recommended)
- [ ] Docker installed (for local Inco node)
- [ ] Git repository cloned

## 📋 Environment Setup

### 1. Backend Environment

Create `backend/.env`:

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```env
# Your deployer private key (NEVER commit this!)
PRIVATE_KEY_BASE_SEPOLIA="your_private_key_here_without_0x"

# Base Sepolia RPC (get from publicnode.com or Alchemy)
BASE_SEPOLIA_RPC_URL="https://base-sepolia-rpc.publicnode.com"

# For testing with multiple wallets
SEED_PHRASE="your twelve word seed phrase here"
```

**Security Warning**: ⚠️ Never commit `.env` to git!

### 2. Frontend Environment

Frontend uses the same wallet provider configured in `wallet/provider.tsx`.

## 🔧 Local Testing (Optional)

### Start Local Inco Node

```bash
cd backend
docker compose up -d
```

Wait 30 seconds for node to initialize.

### Run Tests Locally

```bash
npx hardhat test test/AuctionHeist.test.ts --network localhost
```

Expected output:
```
✓ Should start a new auction
✓ Should accept encrypted bids from multiple players
✓ Alice bids 25 ETH, Bob bids 30 ETH → Bob wins NFT (45s)
```

## 🌐 Deploy to Base Sepolia

### Step 1: Compile Contracts

```bash
cd backend
npx hardhat compile
```

Expected:
```
Compiled 10 Solidity files successfully
```

### Step 2: Deploy AuctionHeist

```bash
npx hardhat ignition deploy ignition/modules/AuctionHeist.ts --network baseSepolia
```

**Important**: Save the contract address from output!

Example output:
```
✅ Deployed AuctionHeist at: 0x1234567890abcdef1234567890abcdef12345678
```

### Step 3: Verify Contract (Optional but Recommended)

```bash
npx hardhat verify --network baseSepolia 0x[YOUR_CONTRACT_ADDRESS]
```

This makes your contract readable on Base Sepolia explorer.

## 🎨 Frontend Configuration

### Update Contract Address

Edit `frontend/utils/constants.ts`:

```typescript
export const AUCTION_CONTRACT_ADDRESS =
  "0x1234567890abcdef1234567890abcdef12345678"; // Your deployed address
```

### Install Dependencies

```bash
cd frontend
npm install
```

### Start Development Server

```bash
npm run dev
```

Visit: `http://localhost:3000`

## 🧪 Post-Deployment Testing

### 1. Start First Auction

Create `backend/scripts/startAuction.js`:

```javascript
const hre = require("hardhat");

async function main() {
  const contractAddress = "0x[YOUR_CONTRACT_ADDRESS]";
  const auction = await hre.ethers.getContractAt("AuctionHeist", contractAddress);
  
  console.log("Starting new auction...");
  const tx = await auction.startAuction();
  await tx.wait();
  
  console.log("✅ Auction started!");
  
  const info = await auction.getCurrentAuction();
  console.log(`Auction ID: ${info[0]}`);
  console.log(`NFT Token ID: ${info[1]}`);
  console.log(`End Time: ${new Date(Number(info[2]) * 1000).toLocaleString()}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

Run:
```bash
npx hardhat run scripts/startAuction.js --network baseSepolia
```

### 2. Submit Test Bid via Frontend

1. Open `http://localhost:3000`
2. Connect MetaMask (Base Sepolia network)
3. Enter bid amount (e.g., 0.01 ETH)
4. Click "Submit Encrypted Bid"
5. Confirm transaction in MetaMask
6. Wait for confirmation

### 3. Verify Privacy on Explorer

1. Go to `https://sepolia.basescan.org/tx/[YOUR_TX_HASH]`
2. Check "Input Data"
3. Verify only encrypted bytes are visible (not actual bid amount)

### 4. Resolve Auction

Create `backend/scripts/resolveAuction.js`:

```javascript
const hre = require("hardhat");

async function main() {
  const contractAddress = "0x[YOUR_CONTRACT_ADDRESS]";
  const auction = await hre.ethers.getContractAt("AuctionHeist", contractAddress);
  
  console.log("Resolving auction...");
  const tx = await auction.resolveAuction();
  await tx.wait();
  
  console.log("✅ Auction resolved!");
  
  try {
    const winner = await auction.getAuctionWinner(0);
    console.log(`Winner: ${winner}`);
  } catch (error) {
    console.log("No bids placed");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

Wait 5+ minutes, then run:
```bash
npx hardhat run scripts/resolveAuction.js --network baseSepolia
```

## 🎬 Two-Player Demo

### Setup Two Wallets

**Wallet A (Alice)**:
- Address: 0xAAA...
- Funded with 0.05 ETH

**Wallet B (Bob)**:
- Address: 0xBBB...
- Funded with 0.05 ETH

### Execution Steps

1. **Start Auction** (as owner):
   ```bash
   npx hardhat run scripts/startAuction.js --network baseSepolia
   ```

2. **Alice Bids 0.02 ETH**:
   - Switch MetaMask to Alice's wallet
   - Open frontend
   - Enter 0.02 ETH
   - Submit bid
   
3. **Bob Bids 0.03 ETH**:
   - Switch MetaMask to Bob's wallet
   - Refresh frontend
   - Enter 0.03 ETH
   - Submit bid

4. **Wait 5 Minutes** (or fast-forward for demo)

5. **Resolve Auction**:
   ```bash
   npx hardhat run scripts/resolveAuction.js --network baseSepolia
   ```

6. **Verify Winner**:
   - Check frontend - should show Bob as winner
   - Verify on Base Sepolia explorer
   - Check NFT ownership: `npx hardhat run scripts/checkNFTOwner.js --network baseSepolia`

## 📹 Recording Demo Video

### What to Show:

1. **Intro (10s)**:
   - Show project README
   - Explain concept: "Confidential auctions using FHE"

2. **Contract Deploy (20s)**:
   - Terminal showing deployment
   - Contract address on explorer

3. **Auction Start (15s)**:
   - Run startAuction script
   - Show frontend with timer

4. **Bidding (30s)**:
   - Alice submits bid
   - Bob submits bid
   - Show transaction on explorer (encrypted data)

5. **Privacy Verification (20s)**:
   - Explorer showing only ciphertext
   - Emphasize "amounts are hidden"

6. **Resolution (20s)**:
   - Resolve auction
   - Winner announced
   - NFT minted

7. **Outro (15s)**:
   - Recap privacy features
   - Show completed NFT ownership

**Total Duration**: ~2 minutes

## 🐛 Troubleshooting

### "Insufficient Fees" Error

**Problem**: Transaction reverts with `InsufficientFees()`

**Solution**: 
```javascript
// Ensure you're sending enough fee
const fee = await auction.getRequiredFee();
const tx = await auction.submitEncryptedBid(encryptedBid, { value: fee });
```

### "AuctionNotActive" Error

**Problem**: Cannot submit bid

**Solutions**:
- Check if auction started: `getCurrentAuction()`
- Verify timer hasn't expired
- Ensure auction isn't resolved

### Frontend Shows "0x000..." Address

**Problem**: Contract address not updated

**Solution**: Update `frontend/utils/constants.ts` with deployed address

### MetaMask Wrong Network

**Problem**: Transactions fail silently

**Solution**: 
1. Add Base Sepolia to MetaMask:
   - Network Name: Base Sepolia
   - RPC URL: https://sepolia.base.org
   - Chain ID: 84532
   - Currency Symbol: ETH

## 📊 Gas Usage Estimates

| Operation | Gas Cost | ~USD (est) |
|-----------|----------|------------|
| Deploy Contract | ~3,500,000 | $7-10 |
| Start Auction | ~150,000 | $0.30 |
| Submit Bid | ~180,000 | $0.36 |
| Resolve Auction | ~220,000 | $0.44 |
| Total per Auction | ~550,000 | ~$1.10 |

**Note**: FHE operations add overhead but ensure privacy!

## ✅ Final Checklist

Before submitting/presenting:

- [ ] Contract deployed and verified on Base Sepolia
- [ ] Frontend running with correct contract address
- [ ] Tested 2-player auction successfully
- [ ] Privacy verified on block explorer
- [ ] NFT minting confirmed
- [ ] Demo video recorded
- [ ] README updated with contract address
- [ ] Judge pitch script prepared

## 🔗 Useful Commands

```bash
# Check contract owner
npx hardhat run scripts/checkOwner.js --network baseSepolia

# Get current auction info
npx hardhat run scripts/getAuctionInfo.js --network baseSepolia

# Check NFT balance
npx hardhat run scripts/checkNFTBalance.js --network baseSepolia

# Get bidder list
npx hardhat run scripts/getBidders.js --network baseSepolia
```

---

**You're ready to demo the first fully on-chain confidential auction! 🚀**
