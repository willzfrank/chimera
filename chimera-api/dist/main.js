"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const platform_socket_io_1 = require("@nestjs/platform-socket.io");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.useWebSocketAdapter(new platform_socket_io_1.IoAdapter(app));
    app.enableCors({ origin: '*' });
    const config = new swagger_1.DocumentBuilder()
        .setTitle('CHIMERA API')
        .setDescription('Autonomous Incident Response Platform — self-organizing AI agent societies that investigate, validate, and resolve production incidents.')
        .setVersion('1.0')
        .addTag('incidents', 'Submit and manage incidents')
        .addTag('analytics', 'Performance metrics and postmortems')
        .addTag('webhooks', 'PagerDuty and generic alert ingestion')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api', app, document);
    await app.listen(3000);
    console.log('CHIMERA API  → http://localhost:3000');
    console.log('Swagger docs → http://localhost:3000/api');
    console.log('WebSocket    → ws://localhost:3000');
}
bootstrap();
//# sourceMappingURL=main.js.map