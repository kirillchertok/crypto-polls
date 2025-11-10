import * as anchor from '@coral-xyz/anchor';
import { sha256 } from '@noble/hashes/sha256';

/**
 * Генерация дискриминатора по имени аккаунта (8 байт)
 */
function getDiscriminator(name: string): Buffer {
    const preimage = `account:${name}`;
    const hash = sha256(new TextEncoder().encode(preimage));
    return Buffer.from(hash).slice(0, 8);
}

/**
 * Получение всех PollAccount из блокчейна
 */
export const fetchAllPolls = async (program: anchor.Program): Promise<any[]> => {
    const connection = program.provider.connection;
    const discriminator = getDiscriminator('PollAccount');

    // Ищем все аккаунты с нужным discriminator
    const accounts = await connection.getProgramAccounts(program.programId, {
        filters: [
            {
                memcmp: {
                    offset: 0,
                    bytes: anchor.utils.bytes.bs58.encode(discriminator),
                },
            },
        ],
    });

    console.log(`🔍 Найдено ${accounts.length} аккаунтов PollAccount`);

    // Используем coder напрямую
    const coder = new anchor.BorshAccountsCoder(program.idl);
    const polls: any[] = [];

    for (const acc of accounts) {
        try {
            // Поскольку в IDL нет idl.accounts[].type, используем decodeUnchecked
            const decoded = coder.decodeUnchecked('PollAccount', acc.account.data);
            if (!decoded || !decoded.poll_id) continue;

            polls.push({
                publicKey: acc.pubkey.toBase58(),
                pollId: decoded.poll_id,
                creator: decoded.creator.toBase58(),
                rewardToken: decoded.reward_token.toBase58(),
                rewardAmount: decoded.reward_amount.toString(),
                totalParticipants: decoded.total_participants,
                claimedParticipants: decoded.claimed_participants,
                topic: decoded.topic,
                activeUntil: Number(decoded.active_until),
                questions: decoded.questions,
                results: decoded.results,
            });
        } catch (err) {
            console.warn('⚠️ Ошибка декодирования аккаунта:', err);
            continue;
        }
    }

    return polls;
};
