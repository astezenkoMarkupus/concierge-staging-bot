import { Module } from '@nestjs/common';
import { TelegramBotService } from './telegram-bot.service';

@Module({
  providers: [TelegramBotService],
})
export class TelegramBotModule {}
// TODO: Add creative features (e.g., random button, admin utilities) here 