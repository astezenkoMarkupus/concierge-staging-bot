import { Controller, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { TelegramBotService } from './telegram-bot.service';

@Controller('telegram')
export class TelegramBotController {
  constructor(private readonly telegramBotService: TelegramBotService) {}

  @Post('webhook')
  handleWebhook(@Req() req: Request, @Res() res: Response) {
    return this.telegramBotService.handleWebhook(req, res);
  }
}
