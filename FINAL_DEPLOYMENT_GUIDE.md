# Final Deployment & Testing Guide

## 🔧 What Was Fixed

### Critical Issue Resolved:
**Problem**: Account size was ~200KB (trying to reserve space for 1000 results), causing "invalid account data" error.

**Solution**: 
- Limited results storage to 50 maximum
- Reduced account size to ~8-10KB (reasonable and efficient)
- Added proper size validation

### Contract Changes:
```rust
const MAX_RESULTS_TO_STORE: usize = 50; // Limit results on-chain
```

This means each poll can have up to 50 participants with full result storage on-chain.

---

## 📋 Prerequisites

Install these if not already installed:

```powershell
# Check versions
node --version    # Should be v16+
rustc --version   # Should be installed
solana --version  # Should be 1.14+
anchor --version  # Should be 0.28+
```

**Installation guides**:
- Node.js: https://nodejs.org/
- Rust: https://rustup.rs/
- Solana: https://docs.solana.com/cli/install-solana-cli-tools
- Anchor: https://www.anchor-lang.com/docs/installation

---

## 🚀 Step-by-Step Deployment

### STEP 1: Start Local Validator

**Terminal 1** - Keep running:
```powershell
solana-test-validator
```

✅ **Verify**: You should see:
```
Ledger location: test-ledger
RPC URL: http://127.0.0.1:8899
```

---

### STEP 2: Configure Solana

**Terminal 2**:
```powershell
# Set to localhost
solana config set --url localhost

# Verify configuration
solana config get
```

✅ **Verify**: RPC URL should be `http://localhost:8899`

```powershell
# Check balance
solana balance
```

✅ **Verify**: You should have ~500,000,000 SOL

---

### STEP 3: Build Contract

```powershell
# Navigate to contract
cd D:\4course\tofd\crypto-polls\contract

# Clean previous builds
anchor clean

# Build
anchor build
```

✅ **Verify**: Build completes without errors

```powershell
# Get program ID
solana address -k target/deploy/contract-keypair.json
```

**Copy this address!** Example: `7kx9Abc123...xyz`

---

### STEP 4: Update Program ID

Open `contract/programs/contract/src/lib.rs`

Find line 4:
```rust
declare_id!("FDVeBn4zL2WjX8jPBWoja4z4UUjFixKbYxpgCExx2DeE");
```

Replace with YOUR program ID from Step 3:
```rust
declare_id!("YOUR_PROGRAM_ID_HERE");
```

**Rebuild**:
```powershell
anchor build
```

✅ **Verify**: Build completes successfully

---

### STEP 5: Deploy Contract

```powershell
anchor deploy --provider.cluster localnet
```

✅ **Verify**: You see `Deploy success`

---

### STEP 6: Create Test Token

```powershell
# Create SPL token
spl-token create-token
```

**IMPORTANT**: Copy the token address!
Example output: `Creating token 9KnR7Q1VxqmW8VwdGPFvhKwp9CGP4D8VgFvWxWZxKx8n`

```powershell
# Set variable (replace with YOUR token address)
$TOKEN = "YOUR_TOKEN_ADDRESS_HERE"

# Create token account
spl-token create-account $TOKEN

# Mint tokens for testing
spl-token mint $TOKEN 10000

# Verify
spl-token balance $TOKEN
```

✅ **Verify**: Balance shows `10000`

---

### STEP 7: Configure Client

**Update token address**:

Edit `client/src/constants/token.ts`:
```typescript
import { PublicKey } from '@solana/web3.js';

export const REWARD_TOKEN_MINT = new PublicKey('YOUR_TOKEN_ADDRESS_HERE');
export const TOKEN_DECIMAL = 1_000_000;
```

**Copy IDL**:
```powershell
# From contract directory
Copy-Item target\idl\contract.json -Destination ..\client\src\idl\contract.json -Force
```

✅ **Verify**: File copied successfully

---

### STEP 8: Install Client Dependencies

```powershell
cd ..\client
npm install
```

✅ **Verify**: Installation completes without errors

---

### STEP 9: Setup Phantom Wallet

1. **Install Phantom**: https://phantom.app/ (if not installed)
2. **Open Phantom**
3. Click **Settings** → **Developer Settings**
4. Toggle **"Testnet Mode"** ON
5. At top, click network dropdown
6. Select **"Localhost"**
7. **Copy your wallet address** (click to copy)

---

### STEP 10: Fund Phantom Wallet

```powershell
# Set variable (replace with YOUR Phantom address)
$PHANTOM = "YOUR_PHANTOM_ADDRESS_HERE"

# Airdrop SOL for fees
solana airdrop 10 $PHANTOM

# Verify SOL received
solana balance $PHANTOM
```

✅ **Verify**: Balance shows ~10 SOL

```powershell
# Create token account for Phantom
spl-token create-account $TOKEN --owner $PHANTOM

# Transfer tokens to Phantom
spl-token transfer $TOKEN 5000 $PHANTOM

# Verify tokens received
spl-token balance $TOKEN --owner $PHANTOM
```

✅ **Verify**: Balance shows `5000`

---

### STEP 11: Start Client

```powershell
# In client directory
npm run dev
```

✅ **Verify**: You see:
```
VITE v5.x.x  ready in XXX ms
➜  Local:   http://localhost:5173/
```

**Open browser**: http://localhost:5173

---

## 🧪 Testing

### TEST 1: Create Poll

1. Click **"Connect Wallet"** (top right)
2. **Connect** Phantom
3. Click **"Create Poll"**
4. Fill form:
   - **Topic**: `"Favorite Programming Language"`
   - **Reward per user**: `10`
   - **Number of participants**: `3`
   - **Active until**: Select tomorrow
   - **Add question**: "What's your favorite?"
   - **Add options**: "JavaScript", "Rust", "Python"
5. Click **"Create Poll"**
6. **Approve transaction** in Phantom
7. **Wait 3-5 seconds**

✅ **Success Indicators**:
- Transaction confirmed in Phantom
- Alert: "Poll created successfully"
- Redirected to home page
- Poll appears in the list

**If it fails**, check:
- Console for errors (F12)
- Token address is correct in `token.ts`
- IDL was copied correctly
- You have enough tokens

---

### TEST 2: View Poll Details

1. On home page, find your poll
2. **Verify displayed info**:
   - Topic: "Favorite Programming Language"
   - Reward: 10 RWD
   - Creator address (truncated)
   - Active until date

---

### TEST 3: Complete Poll (Second Wallet)

**Create second test wallet**:
```powershell
# Generate keypair
solana-keygen new -o $HOME\.config\solana\user2.json --no-bip39-passphrase

# Get address
$USER2 = solana-keygen pubkey $HOME\.config\solana\user2.json

# Fund with SOL
solana airdrop 5 $USER2

# Create token account
spl-token create-account $TOKEN --owner $USER2

# Verify
solana balance $USER2
```

**Import to Phantom**:
1. In Phantom, click account dropdown (top)
2. Click **"+"** Add Account
3. Select **"Import Private Key"**
4. Open `$HOME\.config\solana\user2.json` in notepad
5. Copy the array of numbers `[123,45,67,...]`
6. Paste in Phantom and import

**Complete the poll**:
1. **Switch to user2** in Phantom
2. **Refresh** browser page
3. **Connect** wallet (user2 will connect)
4. Find the poll
5. Click **"Take part"**
6. **Answer the question** (select one option)
7. Click **"Submit"**
8. **Approve BOTH transactions**:
   - First: Submit answers
   - Second: Claim reward
9. **Wait for confirmations**

✅ **Success Indicators**:
- Both transactions confirmed
- Alert: "Poll completed and reward claimed"
- Redirected to home page

**Verify reward received**:
```powershell
spl-token balance $TOKEN --owner $USER2
```

✅ **Verify**: Shows `10` tokens

---

### TEST 4: View Results

1. **Switch back** to original wallet in Phantom
2. **Refresh** page
3. Click **"Profile"** in navigation
4. You should see your poll

✅ **Verify**:
- Poll topic displayed
- Total participants: 1
- Vote counts per option
- Percentage displayed

---

## 🔍 Monitoring Commands

### Watch Live Logs (Terminal 3):
```powershell
# Replace with YOUR program ID
solana logs YOUR_PROGRAM_ID
```

### Check Token Balances:
```powershell
# Your balance
spl-token balance $TOKEN

# All accounts
spl-token accounts $TOKEN

# Specific address
spl-token balance $TOKEN --owner $USER2
```

### View Transaction:
```powershell
solana confirm -v TRANSACTION_SIGNATURE
```

---

## 🐛 Troubleshooting

### Error: "Account registry not provided"
**Cause**: Old IDL

**Fix**:
```powershell
cd contract
anchor build
Copy-Item target\idl\contract.json -Destination ..\client\src\idl\contract.json -Force
# Stop client (Ctrl+C) and restart
cd ..\client
npm run dev
```

### Error: "Invalid account data for instruction"  
**Cause**: This was the main bug - now fixed! If you still see it:

**Fix**:
```powershell
# Ensure contract is rebuilt after the fixes
cd contract
anchor clean
anchor build
anchor deploy --provider.cluster localnet
Copy-Item target\idl\contract.json -Destination ..\client\src\idl\contract.json -Force
```

### Error: "Token account doesn't exist"
**Fix**:
```powershell
spl-token create-account $TOKEN --owner $PHANTOM
```

### Error: "Insufficient funds"
**Fix**:
```powershell
solana airdrop 5 $PHANTOM
```

### Poll not showing up
- Wait 5 seconds and refresh
- Check console (F12) for errors
- Verify wallet is connected
- Check you're on localhost network in Phantom

---

## 🔄 Complete Reset

If you need to start completely fresh:

```powershell
# Terminal 1: Stop validator (Ctrl+C)

# Delete blockchain data
Remove-Item -Recurse -Force test-ledger

# Restart validator
solana-test-validator
```

Then repeat from **STEP 3** (rebuild and redeploy everything).

---

## ✅ Success Checklist

Mark these off as you complete:

- [ ] Local validator running
- [ ] Solana configured for localhost
- [ ] Contract built successfully  
- [ ] Program ID updated in code
- [ ] Contract deployed
- [ ] Test token created and minted
- [ ] Token address updated in client
- [ ] IDL copied to client
- [ ] Client dependencies installed
- [ ] Phantom on localhost network
- [ ] Phantom funded with SOL
- [ ] Phantom has test tokens
- [ ] Client running
- [ ] Poll created successfully ✨
- [ ] Poll visible on home page
- [ ] Second wallet created
- [ ] Second wallet funded
- [ ] Poll completed by second wallet
- [ ] Rewards received (10 tokens)
- [ ] Results visible in profile

---

## 📊 Account Size Information

Your polls now use reasonable account sizes:

- **Base poll data**: ~300-500 bytes
- **Per question**: ~50-100 bytes
- **Per result stored**: ~150 bytes
- **Maximum results**: 50 participants
- **Total max size**: ~8-10 KB

This is much more efficient than the previous 200KB!

---

## 🎉 You're Done!

Once all checkboxes are marked, you have:
- ✅ A fully functional decentralized polling dApp
- ✅ On-chain data storage
- ✅ Automatic reward distribution
- ✅ No database/server needed
- ✅ Transparent, verifiable results

---

## 🚀 Next Steps

### Test More Scenarios:
1. Create poll with multiple questions
2. Test "many" (multiple choice) questions
3. Try to submit twice (should fail - "Already participated")
4. Try expired poll (create one with past date)
5. Test with 3+ different wallets

### Deploy to Devnet:
```powershell
solana config set --url devnet
solana airdrop 2  # Get devnet SOL
cd contract
anchor build
anchor deploy
# Update IDL and test on real devnet
```

### Production (Mainnet):
⚠️ Only when fully tested!
```powershell
solana config set --url mainnet-beta
cd contract
anchor deploy  # Costs real SOL!
```

---

## 📞 Need Help?

### Quick Checks:
```powershell
# Is validator running?
Get-Process | Where-Object {$_.ProcessName -like "*solana*"}

# Current Solana config
solana config get

# Your SOL balance
solana balance

# Token balance
spl-token balance $TOKEN

# Program info
solana program show YOUR_PROGRAM_ID
```

### Common Commands:
```powershell
# Airdrop more SOL
solana airdrop 5

# Check if account exists
solana account YOUR_ADDRESS

# View recent transactions
solana transaction-history

# List all token accounts
spl-token accounts
```

---

**Everything is now fixed and ready to test! Follow the steps carefully and you'll have a working dApp! 🎊**

