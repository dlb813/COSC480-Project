# Web3 Network Configuration Guide

## Problem
The app is showing: `Error: could not detect network` when trying to access wallet balance.

## Root Cause
The `RPC_URL` is not configured in `.env`, so it defaults to `http://localhost:8545` (local Hardhat blockchain), which isn't running.

## Solution: Choose ONE Option

### **Option A: Use Sepolia Testnet (RECOMMENDED)**
This requires no local blockchain setup and is the easiest.

#### Step 1: Get a Free RPC URL
Choose one of these free providers:

**Infura:**
1. Go to https://www.infura.io/
2. Sign up for free
3. Create a new project
4. Copy your Sepolia RPC URL: `https://sepolia.infura.io/v3/YOUR_PROJECT_ID`

**OR Alchemy:**
1. Go to https://www.alchemy.com/
2. Sign up for free
3. Create a new app (choose Sepolia network)
4. Copy your RPC URL: `https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY`

#### Step 2: Update .env
Edit `.env` and replace the RPC_URL line:
```
RPC_URL = https://sepolia.infura.io/v3/YOUR_PROJECT_ID
```

#### Step 3: Test ETH
Get free test ETH from a Sepolia faucet:
- https://sepoliafaucet.com/
- https://www.infura.io/faucet/sepolia

#### Step 4: Restart App
```powershell
node app.js
```

---

### **Option B: Use Local Hardhat Blockchain**
If you want a local blockchain without needing RPC keys.

#### Step 1: Install Hardhat (if not already)
```powershell
cd Web3
npm install --save-dev hardhat
npx hardhat init
```

#### Step 2: Start Hardhat Node
```powershell
cd Web3
npx hardhat node
```
This starts a local blockchain at `http://localhost:8545`

#### Step 3: Update .env
```
RPC_URL = http://localhost:8545
```

#### Step 4: In Another Terminal, Start the App
```powershell
cd COSC-480-website
node app.js
```

**Note:** Hardhat node must remain running in the background

---

## Verification

After setting up, test by:
1. Log in to the app
2. Navigate to the wallet page
3. Click "Refresh Balance" or create a wallet
4. You should see the balance load without errors

## Troubleshooting

### Still Getting "Network Error"?
1. Check that RPC_URL is set correctly in `.env`
2. For Sepolia: Verify your RPC URL is accessible by opening it in browser
3. For Local: Ensure `npx hardhat node` is running in another terminal
4. Restart the app with `node app.js`

### "ethers is not defined"?
The app now automatically waits for ethers.js library to load. If you still see this:
1. Clear browser cache (Ctrl+Shift+Delete)
2. Refresh the page
3. Check browser console (F12) for CDN errors

### Still Having Issues?
1. Check browser console (F12) for error messages
2. Check terminal where `node app.js` is running for server logs
3. Ensure `.env` file is saved with correct RPC_URL
