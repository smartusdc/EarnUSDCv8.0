import { CONFIG, EVENTS, ERRORS } from './config.js';
import { stateService } from './state.js';
import { contractService } from './contract.js';
import { transactionService } from './transactions.js';

class UIService {
    constructor() {
        this.elements = {};
        this.isInitialized = false;
    }

    initialize() {
        if (this.isInitialized) return;

        this.initializeElements();
        this.setupEventListeners();
        this.isInitialized = true;
    }

    initializeElements() {
        // メイン画面要素
        this.elements = {
            welcomeScreen: document.getElementById('welcomeScreen'),
            mainInterface: document.getElementById('mainInterface'),
            
            // ウォレット関連
            connectButton: document.getElementById('connectWallet'),
            disconnectButton: document.getElementById('disconnectWallet'),
            walletStatus: document.getElementById('walletStatus'),
            walletAddress: document.getElementById('walletAddress'),
            walletTypeDisplay: document.getElementById('walletTypeDisplay'),

            // 残高と報酬表示
            userBalance: document.getElementById('userBalance'),
            usdValue: document.getElementById('usdValue'),
            pendingRewards: document.getElementById('pendingRewards'),

            // レート表示
            currentAPR: document.getElementById('currentAPR'),
            referrerRate: document.getElementById('referrerRate'),
            referredRate: document.getElementById('referredRate'),

            // 操作部分
            amountInput: document.getElementById('amount'),
            depositButton: document.getElementById('deposit'),
            withdrawButton: document.getElementById('withdraw'),
            maxButton: document.getElementById('maxAmount'),
            claimRewardsButton: document.getElementById('claimRewards'),

            // リファラル関連
            referralCodeInput: document.getElementById('referralCodeInput'),
            referralCodeDisplay: document.getElementById('referralCodeDisplay'),
            fullReferralMessage: document.getElementById('fullReferralMessage'),

            // 通知
            notification: document.getElementById('notification'),
            notificationMessage: document.getElementById('notificationMessage'),
            loadingOverlay: document.getElementById('loadingOverlay')
        };
    }

    setupEventListeners() {
        // ウォレット接続状態の変更検知
        window.addEventListener(EVENTS.UI.WALLET_CONNECTED, (event) => {
            this.handleWalletConnection(event.detail.account);
        });

        window.addEventListener(EVENTS.UI.WALLET_DISCONNECTED, () => {
            this.handleWalletDisconnection();
        });

        // 状態更新の検知
        window.addEventListener(EVENTS.UI.STATE_UPDATED, (event) => {
            this.handleStateUpdate(event.detail);
        });

        // 入力値の検証
        this.elements.amountInput.addEventListener('input', (e) => {
            this.validateAmount(e.target.value);
        });

        // ボタン操作
        this.elements.maxButton.addEventListener('click', this.handleMaxAmount.bind(this));
        this.elements.depositButton.addEventListener('click', this.handleDeposit.bind(this));
        this.elements.withdrawButton.addEventListener('click', this.handleWithdraw.bind(this));
        this.elements.claimRewardsButton.addEventListener('click', this.handleClaimRewards.bind(this));
    }

    // 入力値の検証
    validateAmount(value) {
        try {
            const amount = ethers.parseUnits(value, CONFIG.DECIMALS.USDC);
            const isValid = amount >= CONFIG.LIMITS.MIN_DEPOSIT;
            
            this.elements.depositButton.disabled = !isValid;
            this.elements.withdrawButton.disabled = !isValid;
            
            return isValid;
        } catch (error) {
            this.elements.depositButton.disabled = true;
            this.elements.withdrawButton.disabled = true;
            return false;
        }
    }

    // 金額表示のフォーマット
    formatAmount(amount) {
        return ethers.formatUnits(amount, CONFIG.DECIMALS.USDC)
            .slice(0, CONFIG.DECIMALS.DISPLAY + 2);
    }

    // トランザクション実行時の共通処理
    async executeTransaction(action) {
        this.elements.loadingOverlay.style.display = 'flex';

        try {
            await action();
            await stateService.updateBalances();
            await stateService.updateRewards();
        } catch (error) {
            this.showNotification(error.message, 'error');
        } finally {
            this.elements.loadingOverlay.style.display = 'none';
        }
    }

    // 預入処理
    async handleDeposit() {
        const amount = this.elements.amountInput.value;
        const referralCode = this.elements.referralCodeInput.value || '0';

        if (!this.validateAmount(amount)) {
            this.showNotification(ERRORS.MINIMUM_AMOUNT, 'error');
            return;
        }

        const parsedAmount = ethers.parseUnits(amount, CONFIG.DECIMALS.USDC);
        await this.executeTransaction(async () => {
            const tx = contractService.prepareDeposit(parsedAmount, referralCode);
            await transactionService.execute(tx);
            this.showNotification('Deposit successful', 'success');
        });
    }

    // 引出処理
    async handleWithdraw() {
        const amount = this.elements.amountInput.value;
        if (!this.validateAmount(amount)) {
            this.showNotification(ERRORS.MINIMUM_AMOUNT, 'error');
            return;
        }

        const parsedAmount = ethers.parseUnits(amount, CONFIG.DECIMALS.USDC);
        await this.executeTransaction(async () => {
            const tx = contractService.prepareWithdraw(parsedAmount);
            await transactionService.execute(tx);
            this.showNotification('Withdrawal successful', 'success');
        });
    }

    // 報酬請求処理
    async handleClaimRewards() {
        await this.executeTransaction(async () => {
            const tx = contractService.prepareClaimRewards();
            await transactionService.execute(tx);
            this.showNotification('Rewards claimed successfully', 'success');
        });
    }

    // MAX金額設定
    async handleMaxAmount() {
        const balance = await contractService.getUSDCBalance();
        this.elements.amountInput.value = this.formatAmount(balance);
        this.validateAmount(this.elements.amountInput.value);
    }

    // ウォレット接続時の処理
    handleWalletConnection(account) {
        const shortAddress = `${account.slice(0, 6)}...${account.slice(-4)}`;
        this.elements.walletAddress.textContent = shortAddress;
        this.elements.walletStatus.style.display = 'flex';
        this.elements.disconnectButton.style.display = 'block';
        this.elements.welcomeScreen.style.display = 'none';
        this.elements.mainInterface.style.display = 'block';
    }

    // ウォレット切断時の処理
    handleWalletDisconnection() {
        this.elements.walletStatus.style.display = 'none';
        this.elements.disconnectButton.style.display = 'none';
        this.elements.welcomeScreen.style.display = 'block';
        this.elements.mainInterface.style.display = 'none';
    }

    // 状態更新時の処理
    handleStateUpdate(detail) {
        const { type, state } = detail;

        switch (type) {
            case 'balances':
                this.updateBalanceDisplay(state);
                break;
            case 'rewards':
                this.updateRewardsDisplay(state);
                break;
            case 'rates':
                this.updateRatesDisplay(state);
                break;
        }
    }

    // 残高表示の更新
    updateBalanceDisplay(balances) {
        this.elements.userBalance.textContent = 
            `${this.formatAmount(balances.deposits)} USDC`;
        this.elements.usdValue.textContent = 
            this.formatAmount(balances.deposits);
    }

    // 報酬表示の更新
    updateRewardsDisplay(rewards) {
        this.elements.pendingRewards.textContent = 
            `${this.formatAmount(rewards.pending)} USDC`;
        this.elements.claimRewardsButton.disabled = rewards.pending <= 0;
    }

    // レート表示の更新
    updateRatesDisplay(rates) {
        this.elements.currentAPR.textContent = `${rates.apr.toFixed(2)}%`;
        this.elements.referrerRate.textContent = `${rates.referrer.toFixed(2)}%`;
        this.elements.referredRate.textContent = `${rates.referred.toFixed(2)}%`;
    }

    // 通知の表示
    showNotification(message, type = 'info') {
        this.elements.notificationMessage.textContent = message;
        this.elements.notification.className = `notification ${type} show`;

        setTimeout(() => {
            this.elements.notification.classList.remove('show');
        }, 3000);
    }

    // クリーンアップ
    cleanup() {
        this.isInitialized = false;
        Object.keys(this.elements).forEach(key => {
            this.elements[key] = null;
        });
    }
}

export const uiService = new UIService();
