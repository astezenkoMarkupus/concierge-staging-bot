import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TelegramBotService } from './telegram-bot/telegram-bot.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  await app.listen(process.env.PORT || 10000, '0.0.0.0');
  console.log('HTTP server started');

  const botService = app.get(TelegramBotService);
  await botService.start();
}
bootstrap();
