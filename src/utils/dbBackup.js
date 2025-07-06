const fs = require('fs');
const path = require('path');
const { scheduleJob } = require('node-schedule');
const { isAdmin } = require('./userManager');

class DatabaseBackup {
  constructor(bot) {
    this.bot = bot;
    this.dbPath = path.join(__dirname, '../rdp.db');
    this.backupSchedule = '0 0 * * 0'; // Every Sunday at midnight
  }

  async sendBackupToAdmin() {
    try {
      const adminId = process.env.ADMIN_ID;
      if (!adminId) {
        console.error('Admin ID not configured');
        return;
      }

      const stats = fs.statSync(this.dbPath);
      const fileSizeInMB = stats.size / (1024 * 1024);

      await this.bot.sendDocument(adminId, this.dbPath, {
        caption: `📊 *Weekly Database Backup*\n\n` +
                `📅 Date: ${new Date().toLocaleDateString()}\n` +
                `📦 Size: ${fileSizeInMB.toFixed(2)} MB`,
        parse_mode: 'Markdown'
      });

      console.log('Database backup sent successfully');
    } catch (error) {
      console.error('Error sending database backup:', error);
    }
  }

  scheduleBackup() {
    scheduleJob(this.backupSchedule, () => {
      this.sendBackupToAdmin();
    });
    console.log('Database backup scheduled');
  }

  async handleManageDatabase(chatId, messageId) {
    if (!isAdmin(chatId)) {
      await this.bot.editMessageText(
        '❌ Access denied. Admin only feature.',
        {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: {
            inline_keyboard: [[
              { text: '« Back', callback_data: 'back_to_menu' }
            ]]
          }
        }
      );
      return;
    }

    await this.bot.editMessageText(
      '📊 *Database Management*\n\n' +
      '• Weekly backups are scheduled every Sunday\n' +
      '• You can request manual backup anytime\n\n' +
      'Choose an option:',
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📥 Download Backup Now', callback_data: 'backup_now' }],
            [{ text: '« Back to Menu', callback_data: 'back_to_menu' }]
          ]
        }
      }
    );
  }
}

module.exports = DatabaseBackup;