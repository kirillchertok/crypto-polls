# Poll Visibility Fix Guide

## Problem Identified

Polls created by one account are not visible to other accounts. After investigation, I found **two critical issues**:

### Issue 1: Outdated IDL File ⚠️

The `client/src/idl/contract.json` file is **out of sync** with your deployed contract. The IDL still references a `registry` account that was removed from the contract, which causes:

- Incorrect account structure when fetching polls
- Potential deserialization errors
- Polls not being found by the client

**This is the most likely cause of your issue.**

### Issue 2: Inefficient Poll Fetching Method

The previous implementation used manual discriminator matching instead of Anchor's built-in methods, which can cause issues with account discovery.

## Solution Implemented

I've made the following improvements:

### 1. Fixed `fetchAllPolls.ts`

**Changes:**
- ✅ Now uses Anchor's built-in `program.account.pollAccount.all()` method
- ✅ Comprehensive logging at every step
- ✅ Better error handling that doesn't crash the app
- ✅ Proper token decimal conversion
- ✅ More robust question type detection

**New logging output you'll see:**
```
🔍 Fetching all polls from program: [program-id]
✅ Found X poll account(s) on blockchain
📊 Processing poll: { pollId, creator, topic, ... }
✅ Poll processed successfully: { id, reward, activeUntil }
✅ Successfully processed X poll(s)
```

### 2. Fixed `Polls.tsx` 

**Changes:**
- ✅ Better vault balance logging
- ✅ Returns `true` on balance check errors (to not filter out polls unnecessarily)
- ✅ More informative console output

## Required Steps to Fix

### Step 1: Update the IDL File 🔧

Your contract and IDL are out of sync. You need to regenerate the IDL:

```bash
# Navigate to contract directory
cd contract

# Build the contract (this regenerates the IDL)
anchor build

# Copy the new IDL to the client
# Windows PowerShell:
Copy-Item "target\idl\contract.json" "..\client\src\idl\contract.json" -Force

# Or manually copy from:
# contract/target/idl/contract.json
# To:
# client/src/idl/contract.json
```

### Step 2: Verify the Contract is Deployed

Make sure your contract is properly deployed to the local validator:

```bash
# In the contract directory
anchor deploy
```

### Step 3: Restart the Client

```bash
cd client
npm run dev
```

### Step 4: Test the Fix

1. Open the browser console (F12)
2. Navigate to the polls page
3. Look for the new logging output:

**If polls exist, you should see:**
```
🔍 Fetching all polls from program: FDVeBn4zL2WjX8jPBWoja4z4UUjFixKbYxpgCExx2DeE
✅ Found 2 poll account(s) on blockchain
📊 Processing poll: { pollId: 'poll_...', creator: '...', topic: 'Test Poll' }
✅ Poll processed successfully: { id: 'poll_...', reward: 10, activeUntil: '2025-11-15' }
✅ Successfully processed 2 poll(s)
```

**If no polls exist, you should see:**
```
🔍 Fetching all polls from program: FDVeBn4zL2WjX8jPBWoja4z4UUjFixKbYxpgCExx2DeE
✅ Found 0 poll account(s) on blockchain
⚠️ No poll accounts found. Make sure polls have been created and deployed correctly.
```

## Debugging Checklist

If polls still don't show after the above steps:

### ✅ Check 1: Verify Local Validator is Running

```bash
# Should return validator info
solana cluster-version

# Should show http://127.0.0.1:8899
solana config get
```

### ✅ Check 2: Verify Contract is Deployed

```bash
# Should show your program
solana program show FDVeBn4zL2WjX8jPBWoja4z4UUjFixKbYxpgCExx2DeE
```

### ✅ Check 3: Verify Polls Were Actually Created

In the browser console after creating a poll, you should see:
```
Poll created successfully. Transaction: [tx-signature]
```

You can verify the transaction:
```bash
solana confirm [tx-signature] -v
```

### ✅ Check 4: Verify Account Data

```bash
# This should show poll accounts
solana program dump FDVeBn4zL2WjX8jPBWoja4z4UUjFixKbYxpgCExx2DeE program-dump.bin
```

### ✅ Check 5: Check Browser Console

Open F12 and look for:
- ❌ Any red errors
- ⚠️ Warning messages about account fetching
- 📊 Poll processing logs

### ✅ Check 6: Verify Wallet Connection

Make sure:
- Wallet is connected
- Wallet is funded with SOL and tokens
- Wallet is connected to localhost network

## Common Issues and Solutions

### Issue: "No poll accounts found"

**Possible causes:**
1. No polls have been created yet → Create a poll first
2. Contract not deployed → Run `anchor deploy`
3. Wrong network → Check `client/src/utils/solana/anchorClient.ts` has `RPC_URL = 'http://127.0.0.1:8899'`

### Issue: Polls show in console but not in UI

**Possible causes:**
1. Filters are too strict (expired, own poll, balance issues)
2. Check the filter logs in console:
   ```
   Checking poll: { ... }
   Poll expired, skipping
   ```

### Issue: "Account not found" errors

**Possible causes:**
1. Outdated IDL → Follow Step 1 above
2. Wrong program ID → Verify `declare_id!` in `lib.rs` matches IDL

### Issue: Deserialization errors

**Possible causes:**
1. **Outdated IDL** → This is the most common cause, follow Step 1
2. Contract changed but not rebuilt → Run `anchor build`
3. Ledger reset → If you reset the validator, you need to redeploy

## Quick Test Script

To verify everything is working, create a test poll and check:

```bash
# Terminal 1: Monitor logs
solana logs

# Terminal 2: Watch for transactions
solana confirm -v --commitment confirmed $(solana airdrop 1 | grep -o '[^ ]*$')
```

Then create a poll in the UI and watch for the transaction.

## Expected Behavior

**Account 1 (Creator):**
- Creates a poll
- Poll appears in "My Polls" section
- Poll does NOT appear in "Current active polls" (filtered out as own poll)

**Account 2 (Participant):**
- Poll appears in "Current active polls"
- Can click "Take part" and complete the poll
- Receives rewards after completion

## Technical Details

### Why the IDL Matters

The IDL (Interface Definition Language) is Anchor's way of describing your smart contract's interface. It includes:
- Account structures
- Instruction parameters
- Account discriminators

When the IDL is outdated:
- The client tries to deserialize accounts using the wrong structure
- Discriminators don't match
- Accounts can't be found or decoded

### How Account Fetching Works

1. Client calls `program.account.pollAccount.all()`
2. Anchor uses the discriminator from the IDL to filter accounts
3. Accounts are deserialized using the structure defined in the IDL
4. If structure doesn't match, deserialization fails

## Next Steps

After applying the fix:

1. ✅ Update IDL (most important!)
2. ✅ Test poll creation with Account 1
3. ✅ Switch to Account 2 and verify poll is visible
4. ✅ Complete poll and claim reward
5. ✅ Verify rewards are transferred

If you still have issues after following this guide, check the browser console for the new detailed logs and share the output.

---

## Summary

**Root cause:** Outdated IDL file causing account fetching issues

**Fix:** Rebuild contract and update IDL file

**Verification:** Check browser console for new detailed logging

**Expected result:** Polls visible across different accounts with proper filtering

