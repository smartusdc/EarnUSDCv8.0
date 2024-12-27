export const CONFIG = {
    CONTRACTS: {
        EARN_USDC: '0x3038eBDFF5C17d9B0f07871b66FCDc7B9329fCD8',
        USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    },

    NETWORK: {
        BASE: {
            chainId: '0x2105',  // Base Mainnet (8453)
            chainName: 'Base',
            nativeCurrency: {
                name: 'ETH',
                symbol: 'ETH',
                decimals: 18
            },
            rpcUrls: ['https://mainnet.base.org'],
            blockExplorerUrls: ['https://basescan.org']
        }
    },

    DECIMALS: {
        USDC: 6,
        DISPLAY: 5
    },

    LIMITS: {
        MIN_DEPOSIT: BigInt('10000') // 0.01 USDC (6 decimals)
    },

    INTERVALS: {
        RATE_UPDATE: 60000,    // 1分
        BALANCE_UPDATE: 30000  // 30秒
    }
};

export const EVENTS = {
    CONTRACT: {
        DEPOSIT: 'Deposit',
        WITHDRAWAL: 'Withdrawal',
        REWARD_CLAIMED: 'DepositRewardClaimed',
        REFERRAL_PROCESSED: 'ReferralProcessed'
    },
    
    UI: {
        WALLET_CONNECTED: 'walletConnected',
        WALLET_DISCONNECTED: 'walletDisconnected',
        STATE_UPDATED: 'stateUpdated'
    }
};

export const ERRORS = {
    WALLET_REQUIRED: 'Please connect your wallet',
    NETWORK_ERROR: 'Please switch to Base network',
    TRANSACTION_REJECTED: 'Transaction was rejected',
    INSUFFICIENT_BALANCE: 'Insufficient balance',
    MINIMUM_AMOUNT: 'Amount is below minimum required'
};
