import { Injectable, OnModuleInit } from '@nestjs/common';
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
export class TelegramBotService implements OnModuleInit {
  private bot: Telegraf;

  constructor() {
    this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');
  }

  async onModuleInit() {
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
            await ctx.reply('Welcome to the Telegram Talent Concierge bot! Please enter your 4-digit code.');
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

    // For 4-digit codes
    this.bot.hears(/^\d{4}$/, async (ctx) => {
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
            case 'usage_limit_reached':
              await ctx.reply('Code usage limit reached');
              break;
            case 'user_already_verified':
              await ctx.reply('You are already verified');
              break;
            default:
              await ctx.reply('Incorrect code');
              break;
          }
        }
      } catch (error) {
        console.error('4-digit code check error. ', error);
        await ctx.reply('Error');
      }
    });

    // Fallback for other text
    this.bot.on('message', async ctx => {
      await ctx.reply('Please enter a 4-digit code.');
    });

    await this.bot.launch();
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
