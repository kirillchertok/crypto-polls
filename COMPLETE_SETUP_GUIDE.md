# Complete Setup and Testing Guide

## ✅ Current Status

Your code is **ready to deploy and test**! Here's what's verified:

- ✅ Smart contract compiles (with Rust borrow checker fixes)
- ✅ All client utilities are updated
- ✅ No database/API dependencies remaining  
- ✅ Components use blockchain data only
- ✅ All TypeScript files are correct

## 🎯 What You Need

**Prerequisites to install** (if not already):
- Node.js v16+ 
- Rust toolchain
- Solana CLI
- Anchor Framework v0.28+
- Phantom Wallet browser extension

## 📋 Complete Step-by-Step Guide

### Part 1: Start Local Validator

**Terminal 1** - Keep this running throughout:
```powershell
solana-test-validator
```

Expected output:
```
Ledger location: test-ledger
Identity: 7kx...xyz
RPC URL: http://127.0.0.1:8899
```

---

### Part 2: Configure Solana (Terminal 2)

```powershell
# Set to localhost
solana config set --url localhost

# Verify
solana config get
# Should show: RPC URL: http://localhost:8899

# Check balance (you'll have 500M SOL)
solana balance
```

---

### Part 3: Build and Deploy Contract

```powershell
# Navigate to contract folder
cd D:\4course\tofd\crypto-polls\contract

# Build the contract
anchor build
```

**After first build**, get your program ID:
```powershell
solana address -k target/deploy/contract-keypair.json
```

**Update Program ID:**
- Open `contract/programs/contract/src/lib.rs`
- Line 4: Replace with your program ID from above
- Save the file

**Rebuild with new ID:**
```powershell
anchor build
```

**Deploy to local validator:**
```powershell
anchor deploy --provider.cluster localnet
```

✅ You should see: "Program deployed successfully"

---

### Part 4: Create Test Token

```powershell
# Create a new SPL token
spl-token create-token

# OUTPUT EXAMPLE:
# Creating token 9KnR...xyz
# ⚠️ SAVE THIS ADDRESS!
```

**Save the token address**, then:

```powershell
# Replace <TOKEN> with your token address from above
$TOKEN = "YOUR_TOKEN_ADDRESS_HERE"

# Create token account for yourself
spl-token create-account $TOKEN

# Mint 10,000 tokens for testing
spl-token mint $TOKEN 10000

# Verify balance
spl-token balance $TOKEN
# Should show: 10000
```

---

### Part 5: Setup Client

```powershell
# Navigate to client
cd D:\4course\tofd\crypto-polls\client

# Install dependencies (if not done)
npm install
```

**Update token address in code:**

Edit `client/src/constants/token.ts`:
```typescript
import { PublicKey } from '@solana/web3.js';

export const REWARD_TOKEN_MINT = new PublicKey('YOUR_TOKEN_ADDRESS_HERE');
export const TOKEN_DECIMAL = 1_000_000;
```

**Copy the IDL:**
```powershell
# From client folder
Copy-Item ..\contract\target\idl\contract.json -Destination .\src\idl\contract.json
```

---

### Part 6: Setup Phantom Wallet

1. **Install Phantom** (if not installed): https://phantom.app/
2. **Open Phantom** wallet
3. Click **Settings** (gear icon)
4. Go to **Developer Settings**
5. Toggle **Testnet Mode** ON
6. At the top of wallet, click network dropdown
7. Select **Localhost**
8. **Copy your wallet address** (click on it to copy)

---

### Part 7: Fund Phantom Wallet

```powershell
# Replace with your Phantom address
$PHANTOM = "YOUR_PHANTOM_ADDRESS_HERE"

# Airdrop SOL for transaction fees
solana airdrop 10 $PHANTOM

# Create token account for Phantom
spl-token create-account $TOKEN --owner $PHANTOM

# Transfer tokens to Phantom
spl-token transfer $TOKEN 5000 $PHANTOM

# Verify Phantom has tokens
spl-token balance $TOKEN --owner $PHANTOM
# Should show: 5000
```

---

### Part 8: Start the Client

```powershell
# In client folder
npm run dev
```

Expected output:
```
VITE v5.x.x  ready in XXX ms

➜  Local:   http://localhost:5173/
```

**Open browser**: http://localhost:5173

---

## 🧪 Testing Your dApp

### Test 1: Create a Poll

1. **Click "Connect Wallet"** in the top right
2. **Connect** your Phantom wallet
3. Click **"Create Poll"**
4. Fill in the form:
   - **Topic**: "What's your favorite language?"
   - **Reward per user**: 10 (tokens)
   - **Number of participants**: 3
   - **Active until**: Tomorrow's date
   - **Question 1**: "Pick one"
     - Option: "JavaScript"
     - Option: "Rust"
     - Option: "Python"
5. Click **"Create Poll"**
6. **Approve transaction** in Phantom
7. Wait 2-3 seconds for confirmation

✅ **Success**: Poll appears in the home page list!

---

### Test 2: Complete the Poll (Second Wallet)

**Create a second test wallet:**
```powershell
# Generate new keypair
solana-keygen new -o ~/.config/solana/user2.json --no-bip39-passphrase

# Get the address
$USER2 = solana-keygen pubkey ~/.config/solana/user2.json

# Fund it
solana airdrop 5 $USER2

# Create token account
spl-token create-account $TOKEN --owner $USER2
```

**Import to Phantom:**
1. In Phantom, click account dropdown
2. Click **"+"** to add account
3. Select **"Import Private Key"**
4. Copy content from `~/.config/solana/user2.json` (the array of numbers)
5. Paste and import

**Complete the poll:**
1. **Switch** to user2 in Phantom
2. **Refresh** the page
3. **Connect** wallet (user2)
4. Find your poll in the list
5. Click **"Take part"**
6. **Answer the question**
7. Click **"Submit"**
8. **Approve** BOTH transactions (submit + claim reward)
9. Wait for confirmation

✅ **Success**: Check token balance - you received 10 tokens!

```powershell
# Verify reward received
spl-token balance $TOKEN --owner $USER2
# Should show: 10
```

---

### Test 3: View Results

1. **Switch back** to your original wallet (poll creator)
2. **Refresh** the page if needed
3. Click **"Profile"** in the navigation
4. You should see your poll with:
   - Total participants: 1
   - Vote percentages for each option

✅ **Success**: Results are displayed from blockchain!

---

## 🔍 Monitoring & Debugging

### Watch Live Logs

**Terminal 3:**
```powershell
# Replace with your program ID
solana logs YOUR_PROGRAM_ID
```

You'll see every transaction in real-time!

### Check Balances

```powershell
# Your balance
spl-token balance $TOKEN

# All accounts for token
spl-token accounts $TOKEN

# Specific user balance
spl-token balance $TOKEN --owner <ADDRESS>
```

### View Transaction Details

After any transaction:
```powershell
solana confirm -v TRANSACTION_SIGNATURE
```

---

## 🐛 Troubleshooting

### "Account registry not provided"
**Cause**: Old IDL being used

**Fix**:
```powershell
cd contract
anchor build
Copy-Item target\idl\contract.json -Destination ..\client\src\idl\contract.json
# Restart client (Ctrl+C then npm run dev)
```

### "Token account doesn't exist"
**Fix**:
```powershell
spl-token create-account $TOKEN --owner <YOUR_ADDRESS>
```

### "Insufficient funds for transaction"
**Fix**:
```powershell
solana airdrop 5 <YOUR_ADDRESS>
```

### Poll not appearing
- Wait 3-5 seconds for confirmation
- Refresh the browser
- Check console for errors (F12)

### Phantom not connecting
- Make sure Phantom is on **Localhost** network
- Refresh the page
- Try disconnecting and reconnecting

### Build fails
```powershell
cd contract
anchor clean
anchor build
```

---

## 🔄 Reset Everything

If you want to start completely fresh:

```powershell
# Stop validator (Ctrl+C in Terminal 1)

# Delete blockchain data
Remove-Item -Recurse -Force test-ledger

# Start fresh validator
solana-test-validator
```

Then repeat from Part 3 (deploy contract, create token, etc.)

---

## ✅ Success Checklist

Mark these off as you complete them:

- [ ] Local validator running
- [ ] Contract built successfully
- [ ] Contract deployed to localhost
- [ ] Test token created
- [ ] Token address updated in code
- [ ] IDL copied to client
- [ ] Client dependencies installed
- [ ] Phantom on localhost network
- [ ] Phantom funded with SOL and tokens
- [ ] Poll created successfully
- [ ] Poll completed by second user
- [ ] Rewards automatically received
- [ ] Results visible in profile

---

## 🎉 You Did It!

Once all checkboxes are marked, you have a **fully functional decentralized polling dApp**!

## 🚀 Next Steps

1. **Test edge cases**:
   - Try to submit twice (should fail)
   - Try to complete expired poll (should fail)
   - Try with insufficient tokens
   - Create polls with multiple questions

2. **Deploy to Devnet**:
   ```powershell
   solana config set --url devnet
   anchor deploy
   ```

3. **Deploy to Mainnet** (when ready for production):
   ```powershell
   solana config set --url mainnet-beta
   anchor deploy
   ```

---

## 📞 Need Help?

Common commands for reference:

```powershell
# Check Solana config
solana config get

# Check balance
solana balance

# Check validator is running
Get-Process | Where-Object {$_.ProcessName -like "*solana*"}

# View program
solana program show YOUR_PROGRAM_ID

# List token accounts
spl-token accounts

# Check token balance
spl-token balance $TOKEN
```

---

**Happy Testing! Your dApp is ready to go! 🎊**

