const db = require('../config/database');

class BalanceManager {
  // Get current user balance
  static async getUserBalance(userId) {
    try {
      const row = await db.get(
        'SELECT balance FROM users WHERE telegram_id = ?',
        [userId]
      );
      return row ? row.balance : 0;
    } catch (error) {
      console.error('Error getting user balance:', error);
      throw error;
    }
  }

  // Update user balance
  static async updateBalance(userId, amount) {
    try {
      // First, check if user exists
      const user = await db.get(
        'SELECT * FROM users WHERE telegram_id = ?',
        [userId]
      );

      if (!user) {
        // Create new user if doesn't exist
        await db.run(
          'INSERT INTO users (telegram_id, balance) VALUES (?, ?)',
          [userId, amount]
        );
      } else {
        // Update existing user's balance
        await db.run(
          'UPDATE users SET balance = balance + ? WHERE telegram_id = ?',
          [amount, userId]
        );
      }

      // Log the transaction
      await this.logTransaction(userId, amount, 'deposit');
      
      return await this.getUserBalance(userId);
    } catch (error) {
      console.error('Error updating balance:', error);
      throw error;
    }
  }

  // Log transaction history
  static async logTransaction(userId, amount, type) {
    try {
      await db.run(
        'INSERT INTO transactions (user_id, amount, type, created_at) VALUES (?, ?, ?, datetime("now"))',
        [userId, amount, type]
      );
    } catch (error) {
      console.error('Error logging transaction:', error);
      throw error;
    }
  }

  // Get transaction history for a user
  static async getTransactionHistory(userId, limit = 10) {
    try {
      const transactions = await db.all(
        `SELECT * FROM transactions 
         WHERE user_id = ? 
         ORDER BY created_at DESC 
         LIMIT ?`,
        [userId, limit]
      );
      return transactions;
    } catch (error) {
      console.error('Error getting transaction history:', error);
      throw error;
    }
  }
}

module.exports = BalanceManager;