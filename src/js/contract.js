import { ethers } from 'ethers';
import { CONFIG, ERRORS } from './config.js';
import EarnUSDCABI from '../abis/EarnUSDC.json';

class ContractService {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.earnContract = null;
        this.usdcContract = null;
        this.currentAccount = null;
    }

    async initialize(provider, signer) {
        this.provider = provider;
        this.signer = signer;
        this.currentAccount = await signer.getAddress();

        this.earnContract = new ethers.Contract(
            CONFIG.CONTRACTS.EARN_USDC,
            EarnUSDCABI.abi,
            signer
        );

        this.usdcContract = new ethers.Contract(
            CONFIG.CONTRACTS.USDC,
            [
                "function approve(address spender, uint256 amount) returns (bool)",
                "function allowance(address owner, address spender) view returns (uint256)",
                "function balanceOf(address account) view returns (uint256)"
            ],
            signer
        );
    }

    async checkAllowance(amount) {
        const allowance = await this.usdcContract.allowance(
            this.currentAccount,
            CONFIG.CONTRACTS.EARN_USDC
        );
        return allowance >= amount;
    }

    async getUSDCBalance() {
        return await this.usdcContract.balanceOf(this.currentAccount);
    }

    async getDepositBalance() {
        return await this.earnContract.deposits(this.currentAccount);
    }

    async getCurrentRewards() {
        return await this.earnContract.calculateReward(this.currentAccount);
    }

    async getAPR() {
        const apr = await this.earnContract.currentAPR();
        return Number(apr) / 100; // bpsから百分率への変換
    }

    async getReferralRates() {
        const [referrerRate, referredRate] = await Promise.all([
            this.earnContract.referrerRewardRate(),
            this.earnContract.referredRewardRate()
        ]);
        return {
            referrer: Number(referrerRate) / 100,
            referred: Number(referredRate) / 100
        };
    }

    // 預入処理
    prepareDeposit(amount, referralCode = 0) {
        return {
            contract: this.earnContract,
            method: 'depositFunds',
            args: [amount, referralCode],
            description: 'Deposit USDC'
        };
    }

    // 引出処理
    prepareWithdraw(amount) {
        return {
            contract: this.earnContract,
            method: 'withdraw',
            args: [amount],
            description: 'Withdraw USDC'
        };
    }

    // 報酬請求
    prepareClaimRewards() {
        return {
            contract: this.earnContract,
            method: 'claimDepositReward',
            args: [],
            description: 'Claim Rewards'
        };
    }

    // USDC承認
    prepareApprove(amount) {
        return {
            contract: this.usdcContract,
            method: 'approve',
            args: [CONFIG.CONTRACTS.EARN_USDC, amount],
            description: 'Approve USDC'
        };
    }

    cleanup() {
        this.provider = null;
        this.signer = null;
        this.earnContract = null;
        this.usdcContract = null;
        this.currentAccount = null;
    }
}

export const contractService = new ContractService();
