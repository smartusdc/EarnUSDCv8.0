import { CONFIG, EVENTS } from './config.js';
import { contractService } from './contract.js';

class StateService {
    constructor() {
        this.state = {
            wallet: {
                connected: false,
                address: null,
                type: null
            },
            balances: {
                usdc: BigInt(0),
                deposits: BigInt(0)
            },
            rewards: {
                pending: BigInt(0),
                claimed: BigInt(0)
            },
            rates: {
                apr: 0,
                referrer: 0,
                referred: 0
            },
            referral: {
                code: null,
                isReferred: false,
                referrer: null
            },
            lastUpdate: {
                balances: 0,
                rewards: 0,
                rates: 0
            }
        };

        this.updateIntervals = new Map();
        this.isUpdating = new Map();
    }

    // 状態の初期化
    async initialize() {
        if (!contractService.currentAccount) return;

        try {
            await Promise.all([
                this.updateBalances(),
                this.updateRewards(),
                this.updateRates()
            ]);

            this.startPeriodicUpdates();
        } catch (error) {
            console.error('State initialization failed:', error);
            throw error;
        }
    }

    // 定期更新の開始
    startPeriodicUpdates() {
        // 残高の更新（30秒ごと）
        this.updateIntervals.set('balances', 
            setInterval(() => this.updateBalances(), CONFIG.INTERVALS.BALANCE_UPDATE)
        );

        // レートの更新（1分ごと）
        this.updateIntervals.set('rates',
            setInterval(() => this.updateRates(), CONFIG.INTERVALS.RATE_UPDATE)
        );
    }

    // 残高の更新
    async updateBalances() {
        if (this.isUpdating.get('balances')) return;
        this.isUpdating.set('balances', true);

        try {
            const [usdcBalance, depositBalance] = await Promise.all([
                contractService.getUSDCBalance(),
                contractService.getDepositBalance()
            ]);

            this.state.balances.usdc = usdcBalance;
            this.state.balances.deposits = depositBalance;
            this.state.lastUpdate.balances = Date.now();

            this.notifyStateChanged('balances');
        } catch (error) {
            console.error('Balance update failed:', error);
        } finally {
            this.isUpdating.set('balances', false);
        }
    }

    // 報酬の更新
    async updateRewards() {
        if (this.isUpdating.get('rewards')) return;
        this.isUpdating.set('rewards', true);

        try {
            const pendingRewards = await contractService.getCurrentRewards();
            this.state.rewards.pending = pendingRewards;
            this.state.lastUpdate.rewards = Date.now();

            this.notifyStateChanged('rewards');
        } catch (error) {
            console.error('Rewards update failed:', error);
        } finally {
            this.isUpdating.set('rewards', false);
        }
    }

    // レートの更新
    async updateRates() {
        if (this.isUpdating.get('rates')) return;
        this.isUpdating.set('rates', true);

        try {
            const [apr, referralRates] = await Promise.all([
                contractService.getAPR(),
                contractService.getReferralRates()
            ]);

            this.state.rates = {
                apr,
                referrer: referralRates.referrer,
                referred: referralRates.referred
            };
            this.state.lastUpdate.rates = Date.now();

            this.notifyStateChanged('rates');
        } catch (error) {
            console.error('Rates update failed:', error);
        } finally {
            this.isUpdating.set('rates', false);
        }
    }

    // ウォレット接続状態の更新
    updateWalletState(connected, address = null, type = null) {
        this.state.wallet = { connected, address, type };
        this.notifyStateChanged('wallet');
    }

    // 状態変更の通知
    notifyStateChanged(type) {
        window.dispatchEvent(new CustomEvent(EVENTS.UI.STATE_UPDATED, {
            detail: {
                type,
                state: this.getState(type)
            }
        }));
    }

    // 状態の取得
    getState(type = null) {
        if (type) {
            return this.state[type];
        }
        return this.state;
    }

    // クリーンアップ
    cleanup() {
        this.updateIntervals.forEach(interval => clearInterval(interval));
        this.updateIntervals.clear();
        this.isUpdating.clear();
        
        this.state = {
            wallet: { connected: false, address: null, type: null },
            balances: { usdc: BigInt(0), deposits: BigInt(0) },
            rewards: { pending: BigInt(0), claimed: BigInt(0) },
            rates: { apr: 0, referrer: 0, referred: 0 },
            referral: { code: null, isReferred: false, referrer: null },
            lastUpdate: { balances: 0, rewards: 0, rates: 0 }
        };
    }
}

export const stateService = new StateService();
