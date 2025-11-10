# Quick Command Reference

Copy and paste these command blocks in order.

## 🚀 Terminal 1: Start Validator
```powershell
solana-test-validator
```
**Keep running!**

---

## 🔨 Terminal 2: Deploy Everything

### 1. Configure & Deploy Contract
```powershell
cd D:\4course\tofd\crypto-polls\contract
solana config set --url localhost
anchor build

# Get program ID and update lib.rs line 4, then:
anchor build
anchor deploy --provider.cluster localnet
```

### 2. Create Test Token
```powershell
$TOKEN = "PASTE_YOUR_TOKEN_ADDRESS_HERE"
spl-token create-token
# Replace $TOKEN value above with output ^

spl-token create-account $TOKEN
spl-token mint $TOKEN 10000
```

### 3. Setup Client
```powershell
cd ..\client
npm install
Copy-Item ..\contract\target\idl\contract.json -Destination .\src\idl\contract.json

# Edit client/src/constants/token.ts with $TOKEN address
```

### 4. Fund Phantom
```powershell
$PHANTOM = "YOUR_PHANTOM_ADDRESS_HERE"

solana airdrop 10 $PHANTOM
spl-token create-account $TOKEN --owner $PHANTOM
spl-token transfer $TOKEN 5000 $PHANTOM
```

### 5. Run Client
```powershell
npm run dev
```

---

## 🧪 Terminal 3: Create Second Wallet (Optional)

```powershell
solana-keygen new -o ~/.config/solana/user2.json --no-bip39-passphrase
$USER2 = solana-keygen pubkey ~/.config/solana/user2.json

solana airdrop 5 $USER2
spl-token create-account $TOKEN --owner $USER2
```

---

## 🔍 Terminal 4: Monitor (Optional)

```powershell
# Watch logs (replace with your program ID)
solana logs YOUR_PROGRAM_ID

# Or check balances
spl-token balance $TOKEN
spl-token accounts $TOKEN
```

---

## ⚠️ Important Variables to Set

Before running commands, set these:

```powershell
# After creating token
$TOKEN = "YOUR_TOKEN_ADDRESS"

# After getting Phantom address  
$PHANTOM = "YOUR_PHANTOM_ADDRESS"

# After creating user2 (if testing)
$USER2 = "USER2_ADDRESS"
```

---

## 🔄 Reset & Restart

```powershell
# Stop validator (Ctrl+C)
Remove-Item -Recurse -Force test-ledger
solana-test-validator

# Redeploy
cd contract
anchor build
anchor deploy --provider.cluster localnet
Copy-Item target\idl\contract.json -Destination ..\client\src\idl\contract.json
```

---

## ✅ Quick Checks

```powershell
# Validator running?
solana cluster-version

# Balance?
solana balance

# Token balance?
spl-token balance $TOKEN

# Client running?
# Open: http://localhost:5173
```

---

**See COMPLETE_SETUP_GUIDE.md for detailed explanations!**

