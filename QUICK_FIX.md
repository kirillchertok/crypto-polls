# 🚀 Quick Fix: Polls Not Showing

## The Problem

Polls created by one account are not visible to other accounts.

## The Solution (3 Easy Steps)

### 1️⃣ Update the IDL

The IDL file is out of sync with your contract. Run this command from the project root:

**Windows (PowerShell):**
```powershell
.\update-idl.ps1
```

**Linux/Mac:**
```bash
chmod +x update-idl.sh
./update-idl.sh
```

**Or manually:**
```bash
cd contract
anchor build
# Copy contract/target/idl/contract.json to client/src/idl/contract.json
cd ..
```

### 2️⃣ Deploy the Contract

```bash
cd contract
anchor deploy
cd ..
```

### 3️⃣ Restart the Client

```bash
cd client
npm run dev
```

## Test It

1. Open browser console (F12)
2. Navigate to polls page
3. Look for logs like:

```
🔍 Fetching all polls from program: FDVeBn4zL2WjX8jPBWoja4z4UUjFixKbYxpgCExx2DeE
✅ Found X poll account(s) on blockchain
📊 Processing poll: { ... }
✅ Successfully processed X poll(s)
```

## Still Not Working?

Check the detailed guide: `POLL_VISIBILITY_FIX.md`

## What Was Fixed

- ✅ Updated poll fetching to use Anchor's built-in methods
- ✅ Added comprehensive logging throughout
- ✅ Fixed token decimal handling
- ✅ Improved error handling
- ✅ Better vault balance checking

## Why This Happened

The `client/src/idl/contract.json` file was outdated and didn't match the deployed contract. This caused:
- Wrong account structure when fetching polls
- Deserialization errors
- Polls not being found

The IDL must match the contract exactly for the client to communicate properly with the blockchain.

