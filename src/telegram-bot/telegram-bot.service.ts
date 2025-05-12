import { Injectable, OnModuleInit } from '@nestjs/common';
import { Telegraf } from 'telegraf';
import fetch from 'node-fetch';
import { log } from 'console';

@Injectable()
export class TelegramBotService implements OnModuleInit {
  private bot: Telegraf;

  constructor() {
    this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');
  }

  onModuleInit() {
    // Basic /start command
    this.bot.start((ctx) => ctx.reply('Welcome to the Telegram Talent Concierge bot!'));

    // For 4-digit codes
    this.bot.hears(/^\d{4}$/, async (ctx) => {
      const code = ctx.message.text.trim();

      try {
        const response = await fetch('http://localhost:3000/api/verify-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, telegramId: ctx.from.id })
        });
        const data = await response.json();
        
        if (data.valid) {
          ctx.reply('Success');
        } else {
          switch (data.reason) {
            case 'not_found':
              ctx.reply('Code not found');
              break;
            case 'expired':
              ctx.reply('Code expired');
              break;
            case 'already_used':
              ctx.reply('Code already used');
              break;
            case 'usage_limit_reached':
              ctx.reply('Code usage limit reached');
              break;
            case 'user_already_verified':
              ctx.reply('You are already verified');
              break;
            default:
              ctx.reply('Incorrect code');
              break;
          }
        }
      } catch (error) {
        ctx.reply('Error');
      }
    });

    // Fallback for other text
    this.bot.on('message', (ctx) => {
      ctx.reply('Please enter a 4-digit code.');
    });

    this.bot.launch();
  }
}
