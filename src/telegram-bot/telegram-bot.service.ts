import { Injectable, OnModuleInit } from '@nestjs/common';
import { Telegraf, Context } from 'telegraf';
import fetch from 'node-fetch';

@Injectable()
export class TelegramBotService implements OnModuleInit {
  private bot: Telegraf;

  constructor() {
    this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');
  }

  onModuleInit() {
    // Basic /start command
    this.bot.start(async (ctx) => {
      // Get user's telegramId
      const telegramId = ctx.from?.id;

      if (!telegramId) {
        ctx.reply('Cannot determine your Telegram ID.');
        return;
      }

      try {
        // Check user status via API
        const
          statusRes = await fetch(`${process.env.APP_URL}/api/user-status?telegramId=${telegramId}`),
          res       = await statusRes.json();

        switch (res.status) {
          case 'registered':
            ctx.reply('You are already registered! Log in to the app via Telegram:', {
              reply_markup: {
                inline_keyboard: [[
                  { text: 'Log in to Concierge App', web_app: { url: `${process.env.APP_URL}/login-via-telegram` } }
                ]]
              }
            });
            break;

          case 'registration_in_progress':
            ctx.reply('Please complete your registration:', {
              reply_markup: {
                inline_keyboard: [[
                  // Link to the login page via Telegram WebApp
                  { text: 'Finish registration', web_app: { url: `${process.env.APP_URL}/login-via-telegram` } }
                ]]
              }
            });
            break;

          case 'error':
            console.error(`Error while checking registration status: ${res.reason}`);
            ctx.reply('Error while checking registration status.');
            break;

          default:
            ctx.reply('Welcome to the Telegram Talent Concierge bot! Please enter your 4-digit code.');
            break;
        }
      } catch (e) {
        console.error(e);
        ctx.reply('Error while checking registration status.');
      }
    });

    // Check user status and send the appropriate button
    async function sendAppButton(ctx: Context, user: { role: string }, token: string) {
      try {
        // Safely get telegramId
        const telegramId = ctx.from?.id;

        if (!telegramId) {
          ctx.reply('Cannot determine your Telegram ID.');
          return;
        }

        // Request user status by telegramId
        const
          statusRes = await fetch(`${process.env.APP_URL}/api/user-status?telegramId=${telegramId}`),
          res       = await statusRes.json();

        // If user is registered, show button to dashboard
        if (res.status === 'registered') {
          ctx.reply('You are already registered!', {
            reply_markup: {
              inline_keyboard: [[
                { text: 'Open Concierge App', web_app: { url: `${process.env.APP_URL}/dashboard?telegramId=${telegramId}` } }
              ]]
            }
          });
        } else {
          const registrationUrl = `${process.env.APP_URL}/register/${user.role}?token=${token}`;

          ctx.reply('Continue registration:', {
            reply_markup: {
              inline_keyboard: [[
                { text: 'Open Concierge App', web_app: { url: registrationUrl } }
              ]]
            }
          });
        }
      } catch (e) {
        ctx.reply('Error checking registration status.');
      }
    }

    // For 4-digit codes
    this.bot.hears(/^\d{4}$/, async (ctx) => {
      const code = ctx.message.text.trim();

      try {
        const response = await fetch(`${process.env.APP_URL}/api/verify-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, telegramId: ctx.from.id })
        });
        const data = await response.json();
        
        // If code is valid, check user status and show the appropriate button
        if (data.valid) {
          await sendAppButton(ctx, data.user, data.token);
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
