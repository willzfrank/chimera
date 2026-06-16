import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new IoAdapter(app));
  app.enableCors({ origin: '*' });

  const config = new DocumentBuilder()
    .setTitle('CHIMERA API')
    .setDescription(
      'Autonomous Incident Response Platform — self-organizing AI agent societies that investigate, validate, and resolve production incidents.',
    )
    .setVersion('1.0')
    .addTag('incidents', 'Submit and manage incidents')
    .addTag('analytics', 'Performance metrics and postmortems')
    .addTag('webhooks', 'PagerDuty and generic alert ingestion')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
  console.log('CHIMERA API  → http://localhost:3000');
  console.log('Swagger docs → http://localhost:3000/api');
  console.log('WebSocket    → ws://localhost:3000');
}

bootstrap();
