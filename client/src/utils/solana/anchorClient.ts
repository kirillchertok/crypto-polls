import * as anchor from '@coral-xyz/anchor';
import { Connection } from '@solana/web3.js';

import idl from '@/idl/contract.json';

export const RPC_URL = 'http://127.0.0.1:8899';

export const getAnchorClient = (wallet: any) => {
    if (!wallet) throw new Error('Wallet not connected');

    const connection = new Connection(RPC_URL, 'processed');
    const provider = new anchor.AnchorProvider(connection, wallet, {
        preflightCommitment: 'processed',
    });

    const program = new anchor.Program(idl as anchor.Idl, provider);

    return { program, provider, connection };
};
