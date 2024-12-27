import { CONFIG, EVENTS, ERRORS } from './config.js';
import { contractService } from './contract.js';
import { eventService } from './events.js';
import { stateService } from './state.js';
import { transactionService } from './transactions.js';
import { uiService } from './ui.js';

class App {
    constructor() {
        this.isInitialized = false;
        this.provider = null;
        this.signer = null;
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            // 環境チェック
            await this.checkEnvironment();
            
            // Web3プロバイダーの初期化
            await this.initializeProvider();
            
            // UIの初期化
            uiService.initialize();
            
            // イベントリスナーの設定
            this.setupEventListeners();

            // 既存の接続確認
            await this.checkExistingConnection();

            this.isInitialized = true;
        } catch (error) {
            console.error('App initialization failed:', error);
            uiService.showNotification(
                'Failed to initialize application',
                'error'
            );
        }
    }

    async checkEnvironment() {
        if (!window.ethereum) {
            throw new Error(ERRORS.WALLET_REQUIRED);
        }
    }

    async initializeProvider() {
this.provider = new ethers.Web3Provider(window.ethereum); // ここを修正後
        eventService.startProviderEvents(window.ethereum);
    }

    async checkExistingConnection() {
        try {
            const accounts = await this.provider.listAccounts();
            if (accounts.length > 0) {
                await this.handleConnection(accounts[0]);
            }
        } catch (error) {
            console.error('Failed to check existing connection:', error);
        }
    }

    setupEventListeners() {
        // ウォレット接続ボタン
        document.getElementById('connectWallet')
            .addEventListener('click', () => this.connectWallet());

        // ウォレット切断ボタン
        document.getElementById('disconnectWallet')
            .addEventListener('click', () => this.disconnectWallet());

        // トランザクション完了イベント
        window.addEventListener('transactionComplete', (event) => {
            const { description, hash } = event.detail;
            uiService.showNotification(
                `${description} successful`,
                'success'
            );
        });

        // トランザクションエラーイベント
        window.addEventListener('transactionError', (event) => {
            const { error, description } = event.detail;
            uiService.showNotification(
                `${description} failed: ${error}`,
                'error'
            );
        });
    }

    async connectWallet() {
        try {
            await this.checkNetwork();
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });
            await this.handleConnection(accounts[0]);
        } catch (error) {
            console.error('Wallet connection failed:', error);
            uiService.showNotification(error.message, 'error');
        }
    }

    async checkNetwork() {
        const chainId = await window.ethereum.request({
            method: 'eth_chainId'
        });

        if (chainId !== CONFIG.NETWORK.BASE.chainId) {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: CONFIG.NETWORK.BASE.chainId }]
                });
            } catch (error) {
                if (error.code === 4902) {
                    await this.addBaseNetwork();
                } else {
                    throw new Error(ERRORS.NETWORK_ERROR);
                }
            }
        }
    }

    async addBaseNetwork() {
        try {
            await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [CONFIG.NETWORK.BASE]
            });
        } catch (error) {
            throw new Error('Failed to add Base network');
        }
    }

    async handleConnection(account) {
        try {
            this.signer = await this.provider.getSigner();
            
            // 各サービスの初期化
            await contractService.initialize(this.provider, this.signer);
            await stateService.initialize();
            
            // コントラクトイベントの購読開始
            eventService.startContractEvents(contractService.earnContract);

            // ウォレット状態の更新
            const walletType = this.detectWalletType();
            stateService.updateWalletState(true, account, walletType);

        } catch (error) {
            console.error('Connection handling failed:', error);
            throw error;
        }
    }

    detectWalletType() {
        if (window.ethereum.isMetaMask) return 'MetaMask';
        if (window.ethereum.isCoinbaseWallet) return 'Coinbase Wallet';
        if (window.ethereum.isWalletConnect) return 'WalletConnect';
        return 'Unknown Wallet';
    }

    disconnectWallet() {
        // 各サービスのクリーンアップ
        contractService.cleanup();
        eventService.cleanup();
        stateService.cleanup();
        transactionService.cleanup();
        
        // 状態の更新
        stateService.updateWalletState(false);
    }

    cleanup() {
        this.disconnectWallet();
        uiService.cleanup();
        this.isInitialized = false;
        this.provider = null;
        this.signer = null;
    }
}

// アプリケーションの初期化
const app = new App();
document.addEventListener('DOMContentLoaded', () => {
    app.initialize().catch(error => {
        console.error('Application initialization failed:', error);
    });
});

// グローバルなエラーハンドリング
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    uiService.showNotification(
        'An unexpected error occurred',
        'error'
    );
});
