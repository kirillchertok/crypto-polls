#!/bin/bash
# Bash script to rebuild contract and update IDL
# Run this from the project root directory

echo "🔧 Updating Smart Contract IDL..."
echo ""

# Check if we're in the right directory
if [ ! -d "contract" ]; then
    echo "❌ Error: contract directory not found!"
    echo "Please run this script from the project root directory."
    exit 1
fi

if [ ! -d "client" ]; then
    echo "❌ Error: client directory not found!"
    echo "Please run this script from the project root directory."
    exit 1
fi

# Step 1: Build the contract
echo "Step 1: Building smart contract..."
cd contract

if ! anchor build; then
    echo "❌ Build failed!"
    cd ..
    exit 1
fi

echo "✅ Contract built successfully"
cd ..

# Step 2: Check if IDL exists
IDL_SOURCE="contract/target/idl/contract.json"
IDL_DEST="client/src/idl/contract.json"

if [ ! -f "$IDL_SOURCE" ]; then
    echo "❌ IDL file not found at $IDL_SOURCE"
    echo "Make sure the contract built successfully."
    exit 1
fi

echo ""
echo "Step 2: Copying IDL to client..."

# Backup old IDL
if [ -f "$IDL_DEST" ]; then
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_PATH="client/src/idl/contract.json.backup_$TIMESTAMP"
    cp "$IDL_DEST" "$BACKUP_PATH"
    echo "📦 Backed up old IDL to: $BACKUP_PATH"
fi

# Copy new IDL
if cp "$IDL_SOURCE" "$IDL_DEST"; then
    echo "✅ IDL updated successfully"
else
    echo "❌ Error copying IDL"
    exit 1
fi

# Step 3: Show summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ IDL Update Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "  1. Deploy the contract: cd contract && anchor deploy"
echo "  2. Restart the client: cd client && npm run dev"
echo ""
echo "The updated IDL is now at: $IDL_DEST"
echo ""

