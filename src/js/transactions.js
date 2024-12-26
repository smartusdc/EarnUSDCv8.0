import { CONFIG } from './config.js';

class TransactionService {
    constructor() {
        this.pendingTransactions = new Map();
    }

    async execute(transaction) {
        const { contract, method, args, description } = transaction;
        const transactionKey = `${method}-${Date.now()}`;

        if (this.pendingTransactions.has(transactionKey)) {
            throw new Error('Transaction already in progress');
        }

        this.pendingTransactions.set(transactionKey, true);

        try {
            // メソッドの実行
            const tx = await contract[method](...args);
            
            // トランザクションの完了を待機
            const receipt = await tx.wait();

            // トランザクション完了イベントの発行
            window.dispatchEvent(new CustomEvent('transactionComplete', {
                detail: {
                    success: true,
                    description,
                    hash: receipt.hash
                }
            }));

            return receipt;
        } catch (error) {
            // エラー内容の解析と適切なエラーメッセージの生成
            let errorMessage = 'Transaction failed';
            
            if (error.code === 4001) {
                errorMessage = 'Transaction rejected by user';
            } else if (error.code === 'INSUFFICIENT_FUNDS') {
                errorMessage = 'Insufficient balance for transaction';
            } else if (error.data?.message) {
                errorMessage = error.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }

            // トランザクションエラーイベントの発行
            window.dispatchEvent(new CustomEvent('transactionError', {
                detail: {
                    error: errorMessage,
                    description
                }
            }));

            throw new Error(errorMessage);
        } finally {
            this.pendingTransactions.delete(transactionKey);
        }
    }

    async executeWithApproval(transaction, requiredApproval, currentAllowance) {
        // 承認が必要な場合は承認トランザクションを先に実行
        if (BigInt(currentAllowance) < BigInt(requiredApproval)) {
            const approveTx = {
                contract: transaction.contract,
                method: 'approve',
                args: [CONFIG.CONTRACTS.EARN_USDC, requiredApproval],
                description: 'Approve USDC'
            };

            await this.execute(approveTx);
        }

        // メインのトランザクションを実行
        return await this.execute(transaction);
    }

    hasPendingTransactions() {
        return this.pendingTransactions.size > 0;
    }

    cleanup() {
        this.pendingTransactions.clear();
    }
}

export const transactionService = new TransactionService();
