import { Injectable, OnModuleInit } from '@nestjs/common';
import { Telegraf } from 'telegraf';

@Injectable()
export class TelegramBotService implements OnModuleInit {
  private bot: Telegraf;

  constructor() {
    // Debug log to verify token loading
    console.log('TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN);
    // TODO: Replace with your actual bot token or use ConfigService
    this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');
  }

  onModuleInit() {
    // Basic /start command
    this.bot.start((ctx) => ctx.reply('Welcome to the Telegram Talent Concierge bot!'));

    // Creative feature: random button (placeholder)
    this.bot.command('random', (ctx) => {
      ctx.reply('🎲 Here is your random value: ' + Math.floor(Math.random() * 100));
    });

    // New command: /hello
    this.bot.command('hello', (ctx) => {
      ctx.reply('👋 Hello from your NestJS-powered bot!');
    });

    // TODO: Add more creative/admin features here

    this.bot.launch();
  }
}
// Comments: Add more handlers, admin utilities, and creative features as needed. 