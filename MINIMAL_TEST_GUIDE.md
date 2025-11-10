# Minimal Testing Guide - Local Validator

Quick guide to test the dApp on a local Solana validator.

## ⚡ Quick Setup

### 1. Start Local Validator (Terminal 1)

```bash
solana-test-validator
```

**Keep this terminal open!**

### 2. Configure & Build (Terminal 2)

```bash
# Set to localhost
solana config set --url localhost

# Go to contract folder
cd contract

# Build
anchor build

# Get program ID
solana address -k target/deploy/contract-keypair.json
```

**Copy the program ID!**

### 3. Update Program ID

Edit `contract/programs/contract/src/lib.rs` line 4:

```rust
declare_id!("YOUR_PROGRAM_ID_HERE");
```

Then rebuild:

```bash
anchor build
```

### 4. Deploy

```bash
anchor deploy --provider.cluster localnet
```

### 5. Create Test Token

```bash
# Create token
spl-token create-token
# Save this address!

# Create token account
spl-token create-account YOUR_TOKEN_ADDRESS

# Mint tokens
spl-token mint YOUR_TOKEN_ADDRESS 10000
```

### 6. Configure Client

Update `client/src/constants/token.ts`:

```typescript
import { PublicKey } from '@solana/web3.js';

export const REWARD_TOKEN_MINT = new PublicKey('YOUR_TOKEN_ADDRESS');
export const TOKEN_DECIMAL = 1_000_000;
```

Copy IDL:

```bash
cp target/idl/contract.json ../client/src/idl/contract.json
```

### 7. Setup Phantom Wallet

1. Open Phantom
2. Settings → Developer Settings → Enable Testnet Mode
3. Switch network to **Localhost** (top of wallet)
4. Get your wallet address from Phantom

Fund it:

```bash
# Airdrop SOL
solana airdrop 10 YOUR_PHANTOM_ADDRESS

# Create token account and transfer tokens
spl-token create-account YOUR_TOKEN_ADDRESS --owner YOUR_PHANTOM_ADDRESS
spl-token transfer YOUR_TOKEN_ADDRESS 5000 YOUR_PHANTOM_ADDRESS
```

### 8. Start Client

```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173

## 🧪 Test Flow

### Create a Poll

1. Connect Phantom (localhost network)
2. Click "Create Poll"
3. Fill in:
   - Topic: "Test Poll"
   - Reward: 10 tokens
   - Participants: 2
   - Date: Tomorrow
   - Add question with options
4. Submit - approve in Phantom

### Complete the Poll (Second Wallet)

```bash
# Create second wallet
solana-keygen new -o ~/.config/solana/user2.json --no-bip39-passphrase

# Fund it
solana airdrop 5 $(solana-keygen pubkey ~/.config/solana/user2.json)

# Create token account
spl-token create-account YOUR_TOKEN_ADDRESS --owner $(solana-keygen pubkey ~/.config/solana/user2.json)
```

Import `user2.json` to Phantom, then:
1. Switch to user2 wallet
2. Find and complete the poll
3. Rewards auto-transferred!

### View Results

1. Switch back to wallet 1 (creator)
2. Go to Profile
3. See poll results

## 🐛 Troubleshooting

### "Insufficient funds"
```bash
solana airdrop 5
```

### "Token account doesn't exist"
```bash
spl-token create-account YOUR_TOKEN_ADDRESS
```

### Validator not running
```bash
ps aux | grep solana-test-validator
# If not running, start it again
```

### Reset Everything
```bash
# Stop validator (Ctrl+C)
rm -rf test-ledger
solana-test-validator
# Then repeat steps 4-8
```

## 📊 Monitor

Watch logs in real-time:

```bash
solana logs YOUR_PROGRAM_ID
```

Check balances:

```bash
spl-token balance YOUR_TOKEN_ADDRESS
```

## ✅ Success Checklist

- [ ] Validator running
- [ ] Contract deployed
- [ ] Token created & minted
- [ ] Phantom on localhost
- [ ] Poll created
- [ ] Poll completed
- [ ] Rewards received
- [ ] Results visible

Done! 🎉

## 🚀 Next Steps

Once working locally:
- Test on devnet with real airdropped SOL
- Test with multiple users
- Deploy to mainnet for production

---

**Tip**: Keep the validator terminal open during all testing!

