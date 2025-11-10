# Local Validator Testing Guide

This guide shows you how to test the Crypto Polls dApp on a local Solana validator for fast, free development and testing.

## 🎯 Why Local Testing?

- ⚡ **Faster**: No network latency
- 💰 **Free**: No airdrop limits, instant SOL
- 🔄 **Reset anytime**: Start fresh whenever needed
- 🐛 **Better debugging**: Full control over the blockchain

## 📋 Prerequisites

- Solana CLI installed
- Anchor Framework installed
- Node.js installed

## 🚀 Step-by-Step Guide

### Step 1: Start Local Validator

Open a **new terminal window** and run:

```bash
solana-test-validator
```

**Important**: Keep this terminal running! This is your local blockchain.

You should see output like:
```
Ledger location: test-ledger
Identity: 7kx...xyz
Genesis Hash: abc...123
Shred Version: 12345
Gossip Address: 127.0.0.1:1024
RPC URL: http://127.0.0.1:8899
```

### Step 2: Configure Solana CLI

In a **new terminal**, configure Solana to use localhost:

```bash
# Set to local validator
solana config set --url localhost

# Verify configuration
solana config get

# Check balance (should show a lot of SOL)
solana balance
```

The local validator automatically funds your default keypair with 500,000,000 SOL!

### Step 3: Create Local SPL Token

In the same terminal:

```bash
# Create a new token
spl-token create-token

# Output example:
# Creating token 9KnR7Q1VxqmW8VwdGPFvhKwp9CGP4D8VgFvWxWZxKx8n
# Copy this address!

# Save your token address to an environment variable
export TOKEN_MINT=YOUR_TOKEN_ADDRESS_HERE

# Create an associated token account
spl-token create-account $TOKEN_MINT

# Mint yourself 1 million tokens for testing
spl-token mint $TOKEN_MINT 1000000

# Check your balance
spl-token balance $TOKEN_MINT
```

### Step 4: Build and Deploy Contract

```bash
cd contract

# Clean previous builds
anchor clean

# Build the contract
anchor build

# The program ID is automatically generated
# Check it:
solana address -k target/deploy/contract-keypair.json

# Update the program ID in lib.rs
# Edit: contract/programs/contract/src/lib.rs
# Line 4: declare_id!("YOUR_PROGRAM_ID_HERE");

# Rebuild after updating
anchor build

# Deploy to local validator
anchor deploy --provider.cluster localnet
```

**Note**: Deployment on localhost is instant and free!

### Step 5: Initialize Registry

Create a script to initialize the registry:

```bash
# Create initialization script
mkdir -p contract/scripts
```

Create `contract/scripts/initialize-local.ts`:

```typescript
import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import fs from 'fs';

async function main() {
  // Connect to local validator
  const connection = new anchor.web3.Connection('http://127.0.0.1:8899', 'confirmed');
  
  // Load your wallet
  const wallet = anchor.Wallet.local();
  
  // Setup provider
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  });
  anchor.setProvider(provider);

  // Load IDL
  const idl = JSON.parse(
    fs.readFileSync('./target/idl/contract.json', 'utf-8')
  );

  // Get program
  const programId = new anchor.web3.PublicKey(idl.address);
  const program = new Program(idl, programId, provider);

  console.log('Program ID:', programId.toString());
  console.log('Wallet:', wallet.publicKey.toString());

  // Find registry PDA
  const [registryPDA, registryBump] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('registry')],
    program.programId
  );

  console.log('Registry PDA:', registryPDA.toString());

  try {
    // Try to fetch registry (check if already initialized)
    const registry = await program.account.pollRegistry.fetch(registryPDA);
    console.log('✅ Registry already initialized:', registry);
  } catch (e) {
    // Registry doesn't exist, initialize it
    console.log('Initializing registry...');
    
    const tx = await program.methods
      .initializeRegistry()
      .accounts({
        initializer: wallet.publicKey,
        registry: registryPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log('✅ Registry initialized!');
    console.log('Transaction:', tx);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

Run it:

```bash
cd contract
npm install  # If you haven't already
npx ts-node scripts/initialize-local.ts
```

### Step 6: Configure Client for Localhost

Update `client/src/constants/token.ts`:

```typescript
import { PublicKey } from '@solana/web3.js';

// Use your local token address from Step 3
export const REWARD_TOKEN_MINT = new PublicKey('YOUR_LOCAL_TOKEN_ADDRESS');
export const TOKEN_DECIMAL = 1_000_000; // 6 decimals

// Not needed for local testing
export const WEB3_STORAGE_TOKEN = '';
```

Update `client/src/utils/solana/anchorClient.ts` to support localhost:

Find the connection initialization and update it:

```typescript
import { Connection } from '@solana/web3.js';

// Use localhost for development
const SOLANA_RPC_URL = 'http://127.0.0.1:8899';

export const getAnchorClient = (wallet: AnchorWallet) => {
    const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
    const provider = new AnchorProvider(connection, wallet, {
        commitment: 'confirmed',
    });

    // ... rest of the code
};
```

### Step 7: Copy IDL to Client

```bash
# From the contract directory
cp target/idl/contract.json ../client/src/idl/contract.json
```

### Step 8: Setup Phantom Wallet for Localhost

1. Open Phantom Wallet
2. Go to **Settings** → **Developer Settings**
3. Enable **Testnet Mode**
4. At the top, switch network to **Localhost**

**Important**: You'll need to fund your Phantom wallet on localhost:

```bash
# Get your Phantom wallet address from the extension
# Then airdrop SOL to it
solana airdrop 100 YOUR_PHANTOM_ADDRESS

# Also create and fund a token account for Phantom
spl-token create-account $TOKEN_MINT --owner YOUR_PHANTOM_ADDRESS
spl-token transfer $TOKEN_MINT 10000 YOUR_PHANTOM_ADDRESS
```

### Step 9: Start the Client

```bash
cd client

# Install dependencies (if not done)
npm install

# Start development server
npm run dev
```

Open http://localhost:5173

### Step 10: Test Complete Flow

#### Test 1: Create a Poll

1. **Connect Phantom** (should be on localhost)
2. Click **"Create Poll"**
3. Fill in:
   - Topic: "Test Poll"
   - Reward: 100 tokens
   - Participants: 3
   - Active until: Tomorrow
   - Add a question with 2-3 options
4. **Submit** and approve transaction in Phantom
5. Wait for confirmation (should be ~1 second)

**Verify on localhost:**
```bash
# Check program accounts
solana program show YOUR_PROGRAM_ID

# View logs (in another terminal)
solana logs YOUR_PROGRAM_ID
```

#### Test 2: Complete the Poll (Different Wallet)

You'll need a second wallet to test completing polls:

```bash
# Generate a new keypair
solana-keygen new -o ~/.config/solana/test-user-2.json --no-bip39-passphrase

# Fund it
solana airdrop 10 ~/.config/solana/test-user-2.json

# Create token account
spl-token create-account $TOKEN_MINT --owner $(solana-keygen pubkey ~/.config/solana/test-user-2.json)
```

Import this wallet to Phantom:
1. Create new wallet in Phantom
2. Import using the private key from `test-user-2.json`
3. Switch to localhost network

Now complete the poll:
1. Browse polls (should see your test poll)
2. Click and answer questions
3. Submit
4. **Rewards automatically received!**

**Verify reward:**
```bash
spl-token balance $TOKEN_MINT --owner $(solana-keygen pubkey ~/.config/solana/test-user-2.json)
```

#### Test 3: View Results

1. Switch back to the original wallet (poll creator)
2. Go to **"Profile"**
3. See your poll with results
4. Verify the statistics

### Step 11: Watch Logs (Optional)

In a separate terminal:

```bash
# Watch all program logs in real-time
solana logs YOUR_PROGRAM_ID
```

This shows every instruction call and is great for debugging!

## 🔄 Reset Everything

If you want to start fresh:

### Option 1: Restart Validator (Clean Slate)

```bash
# Stop the validator (Ctrl+C in validator terminal)

# Delete ledger data
rm -rf test-ledger

# Start fresh
solana-test-validator
```

Then repeat steps 4-7 (deploy, initialize, configure).

### Option 2: Keep Validator, Redeploy Contract

```bash
cd contract

# Rebuild
anchor build

# Redeploy with force flag
anchor deploy --provider.cluster localnet

# Re-initialize registry
npx ts-node scripts/initialize-local.ts
```

## 🐛 Debugging Tips

### Check Validator is Running

```bash
solana cluster-version
# Should show: localhost
```

### View All Program Accounts

```bash
solana program show YOUR_PROGRAM_ID
```

### Check Token Balances

```bash
# Your balance
spl-token balance $TOKEN_MINT

# Check all accounts for a token
spl-token accounts $TOKEN_MINT
```

### View Transaction Details

After any transaction:
```bash
solana confirm -v TRANSACTION_SIGNATURE
```

### Check Account Data

```bash
# View any account
solana account ACCOUNT_ADDRESS
```

### Common Issues

#### "Connection refused"
- Validator not running → Start `solana-test-validator`
- Wrong URL → Check `solana config get`

#### "Insufficient funds"
- Airdrop more: `solana airdrop 10`

#### "Account not found"
- Registry not initialized → Run initialization script
- Wrong network → Verify Phantom is on localhost

#### "Token account doesn't exist"
- Create token account:
  ```bash
  spl-token create-account $TOKEN_MINT --owner YOUR_ADDRESS
  ```

#### Program logs not showing
- Check program ID is correct
- Restart logs command
- Verify validator is running

## 📊 Monitoring

### Watch Validator Logs

In the terminal running the validator, you'll see all transactions.

### Program Logs

```bash
solana logs YOUR_PROGRAM_ID
```

### Account Changes

```bash
# Watch specific account
solana account YOUR_ACCOUNT --watch
```

## 🧪 Advanced Testing

### Test Multiple Users

Create multiple keypairs:

```bash
for i in {1..5}; do
  solana-keygen new -o ~/.config/solana/user-$i.json --no-bip39-passphrase
  solana airdrop 10 $(solana-keygen pubkey ~/.config/solana/user-$i.json)
  spl-token create-account $TOKEN_MINT --owner $(solana-keygen pubkey ~/.config/solana/user-$i.json)
done
```

### Simulate Network Conditions

```bash
# Start validator with slower block time
solana-test-validator --slots-per-epoch 32 --ticks-per-slot 8
```

### Enable Features

```bash
# Start with specific features enabled
solana-test-validator --reset --bpf-program YOUR_PROGRAM_ID ./target/deploy/contract.so
```

## 📝 Development Workflow

1. **Code** → Make changes to smart contract
2. **Build** → `anchor build`
3. **Deploy** → `anchor deploy --provider.cluster localnet`
4. **Test** → Use the client to test changes
5. **Check logs** → `solana logs YOUR_PROGRAM_ID`
6. **Repeat**

**Tip**: You don't need to restart the validator between deployments!

## 🎓 Next Steps

Once everything works on localhost:

1. **Test on Devnet** → `QUICK_START.md`
2. **Deploy to Production** → `DEPLOYMENT_GUIDE.md`

## 💡 Pro Tips

- Keep validator running during development
- Use `solana logs` for debugging
- Create multiple test wallets for realistic testing
- Use the Solana Explorer for localhost: https://explorer.solana.com/?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899

## 🆘 Need Help?

- Check validator is running: `ps aux | grep solana-test-validator`
- View validator status: `solana cluster-version`
- Full validator logs: Check the terminal where validator is running
- Reset completely: Kill validator, delete `test-ledger`, restart

## 🎉 Success Checklist

- [ ] Validator running
- [ ] Contract deployed
- [ ] Registry initialized
- [ ] Token created and minted
- [ ] Client configured for localhost
- [ ] Phantom connected to localhost
- [ ] Poll created successfully
- [ ] Poll completed and rewards received
- [ ] Results visible in profile

Once all checked, you have a fully working local dApp! 🚀

---

Happy Local Testing! 🧪

