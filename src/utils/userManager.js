const db = require('../config/database');

async function getUser(userId) {
  try {
    let user = await db.get('SELECT * FROM users WHERE telegram_id = ?', [userId]);
    
    if (!user) {
      await db.run(
        'INSERT INTO users (telegram_id, balance) VALUES (?, 0)',
        [userId]
      );
      user = {
        telegram_id: userId,
        balance: 0,
        created_at: new Date().toISOString()
      };
    }
    
    return user;
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
}

function isAdmin(userId) {
  return userId.toString() === process.env.ADMIN_ID;
}

async function addBalance(userId, amount) {
  try {
    // Ensure user exists before adding balance
    await getUser(userId);
    
    await db.run(
      'UPDATE users SET balance = balance + ? WHERE telegram_id = ?',
      [amount, userId]
    );
    
    await db.run(
      'INSERT INTO transactions (user_id, amount, type) VALUES (?, ?, ?)',
      [userId, amount, 'deposit']
    );

    return await getBalance(userId);
  } catch (error) {
    console.error('Error adding balance:', error);
    throw error;
  }
}

async function deductBalance(userId, amount) {
  if (isAdmin(userId)) return true;
  
  try {
    const user = await getUser(userId);
    
    if (user.balance >= amount) {
      await db.run(
        'UPDATE users SET balance = balance - ? WHERE telegram_id = ?',
        [amount, userId]
      );
      
      await db.run(
        'INSERT INTO transactions (user_id, amount, type) VALUES (?, ?, ?)',
        [userId, -amount, 'deduct']
      );
      
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deducting balance:', error);
    throw error;
  }
}

async function getBalance(userId) {
  if (isAdmin(userId)) return "Unlimited";
  
  try {
    const user = await getUser(userId);
    return user.balance;
  } catch (error) {
    console.error('Error getting balance:', error);
    throw error;
  }
}

module.exports = {
  getUser,
  isAdmin,
  addBalance,
  deductBalance,
  getBalance
};