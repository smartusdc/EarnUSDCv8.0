import { EVENTS } from './config.js';

class EventService {
    constructor() {
        this.listeners = new Map();
        this.contractEventHandlers = new Map();
    }

    // コントラクトイベントの購読開始
    startContractEvents(contract) {
        if (!contract) return;

        // Depositイベント
        this.contractEventHandlers.set(
            EVENTS.CONTRACT.DEPOSIT,
            (...args) => {
                const [user, amount] = args;
                window.dispatchEvent(new CustomEvent(EVENTS.UI.STATE_UPDATED, {
                    detail: { type: 'deposit', user, amount }
                }));
            }
        );

        // Withdrawalイベント
        this.contractEventHandlers.set(
            EVENTS.CONTRACT.WITHDRAWAL,
            (...args) => {
                const [user, amount] = args;
                window.dispatchEvent(new CustomEvent(EVENTS.UI.STATE_UPDATED, {
                    detail: { type: 'withdrawal', user, amount }
                }));
            }
        );

        // RewardClaimedイベント
        this.contractEventHandlers.set(
            EVENTS.CONTRACT.REWARD_CLAIMED,
            (...args) => {
                const [user, reward, bonus] = args;
                window.dispatchEvent(new CustomEvent(EVENTS.UI.STATE_UPDATED, {
                    detail: { type: 'reward', user, reward, bonus }
                }));
            }
        );

        // イベントの登録
        this.contractEventHandlers.forEach((handler, event) => {
            contract.on(event, handler);
            this.listeners.set(event, handler);
        });
    }

    // Ethereumプロバイダーイベントの購読開始
    startProviderEvents(provider) {
        if (!provider) return;

        // アカウント変更イベント
        const accountsHandler = (accounts) => {
            if (accounts.length === 0) {
                window.dispatchEvent(
                    new CustomEvent(EVENTS.UI.WALLET_DISCONNECTED)
                );
            } else {
                window.dispatchEvent(
                    new CustomEvent(EVENTS.UI.WALLET_CONNECTED, {
                        detail: { account: accounts[0] }
                    })
                );
            }
        };

        // チェーン変更イベント
        const chainHandler = () => {
            window.location.reload();
        };

        provider.on('accountsChanged', accountsHandler);
        provider.on('chainChanged', chainHandler);

        this.listeners.set('accountsChanged', accountsHandler);
        this.listeners.set('chainChanged', chainHandler);
    }

    // イベント購読の解除
    cleanup() {
        // コントラクトイベントの解除
        this.contractEventHandlers.forEach((handler, event) => {
            if (this.contract) {
                this.contract.off(event, handler);
            }
        });

        // プロバイダーイベントの解除
        if (window.ethereum) {
            const accountsHandler = this.listeners.get('accountsChanged');
            const chainHandler = this.listeners.get('chainChanged');
            
            if (accountsHandler) {
                window.ethereum.removeListener('accountsChanged', accountsHandler);
            }
            if (chainHandler) {
                window.ethereum.removeListener('chainChanged', chainHandler);
            }
        }

        this.listeners.clear();
        this.contractEventHandlers.clear();
    }
}

export const eventService = new EventService();
