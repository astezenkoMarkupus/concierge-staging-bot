import { Injectable } from '@nestjs/common';
import { Telegraf, Context } from 'telegraf';
import fetch from 'node-fetch';

type UserStatusResponse = {
  status: string,
  reason?: string
};

type VerifyCodeResponse = {
  valid: boolean,
  user?: {id: number, telegramId: string|null, role: string},
  reason?: string
};

@Injectable()
export class TelegramBotService {
  private bot: Telegraf;

  constructor() {
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN is missing');
    }

    this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');
  }

  async start() {
    this.bot.catch((err) => {
      console.error('Telegram bot runtime error:', err);
    });

    // Basic /start command
    this.bot.start(async (ctx) => {
      // Get user's telegramId
      const telegramId = ctx.from?.id;

      if (!telegramId) {
        await ctx.reply('Cannot determine your Telegram ID.');
        return;
      }

      try {
        // Check user status via API
        const
          statusRes = await fetch( `${ process.env.APP_URL }/api/user-status?telegramId=${ telegramId }` ),
          res       = ( await statusRes.json() ) as UserStatusResponse;

        switch (res.status) {
          case 'registered':
            await sendButtonMarkup(ctx, 'Open your Dashboard:');
            break;

          case 'registration_in_progress':
            await sendButtonMarkup(ctx, 'Continue registration:');
            break;

          case 'error':
            console.error(`Error while checking registration status: ${res.reason}`);
            await ctx.reply('Error while checking registration status.');
            break;

          default:
            await ctx.reply('Welcome to the Telegram Talent Concierge bot! Please enter your code (8 symbols).');
            break;
        }
      } catch (e) {
        console.error(e);
        await ctx.reply('Error while checking registration status.');
      }
    });

    // Check the user status and send the appropriate button
    async function sendAppButton(ctx: Context): Promise<void> {
      try {
        // Safely get telegramId
        const telegramId = ctx.from?.id;

        if (!telegramId) {
          await ctx.reply('Cannot determine your Telegram ID.');
          return;
        }

        // Request user status by telegramId
        const
          statusRes = await fetch(`${process.env.APP_URL}/api/user-status?telegramId=${telegramId}`),
          res       = (await statusRes.json()) as UserStatusResponse;

        // Check if a user is registered
        if (res.status === 'registered') {
          await sendButtonMarkup(ctx, 'You are already registered!');
        } else {
          await sendButtonMarkup(ctx, 'Continue registration:');
        }
      } catch (e) {
        console.error('Send App Button error. ', e);
        await ctx.reply('Error checking registration status.');
      }
    }

    // For 8-character codes (uppercase letters and digits)
    this.bot.hears(/^[A-Z0-9]{8}$/, async (ctx) => {
      const code = ctx.message.text.trim();

      try {
        const response = await fetch(`${process.env.APP_URL}/api/verify-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, telegramId: ctx.from.id, username: ctx.from.username })
        });
        const data = (await response.json()) as VerifyCodeResponse;
        
        // If the code is valid, check the user status and show the appropriate button
        if (data.valid) {
          if (data.user) {
            await sendAppButton(ctx);
          } else {
            await ctx.reply('User is invalid');
          }
        } else {
          switch (data.reason) {
            case 'not_found':
              await ctx.reply('Code not found');
              break;
            case 'expired':
              await ctx.reply('Code expired');
              break;
            case 'already_used':
              await ctx.reply('Code already used');
              break;
            case 'rate_limit_exceeded':
              await ctx.reply('Too many attempts. Please try again later.');
              break;
            case 'user_already_verified':
              await ctx.reply('You are already verified');
              break;
            default:
              await ctx.reply('Incorrect code. Please try again later.');
              break;
          }
        }
      } catch (error) {
        console.error('Code check error. ', error);
        await ctx.reply('Error');
      }
    });

    // Fallback for other text
    this.bot.on('message', async ctx => {
      await ctx.reply('Please enter a code (8 symbols, uppercase letters and digits are allowed).');
    });

    // Ensure polling mode is not blocked by a previously configured webhook.
    await this.bot.telegram.deleteWebhook({ drop_pending_updates: false });
    await this.bot.launch();
    console.log('Telegram bot polling started');
  }
}

const sendButtonMarkup = async (ctx: Context, text: string) => {
  await ctx.reply(text, {
    reply_markup: {
      inline_keyboard: [[
        {
          text: 'Open Concierge App',
          web_app: { url: `${process.env.APP_URL}/login-via-telegram` }
        }
      ]]
    }
  });
};
