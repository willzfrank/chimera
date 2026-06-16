"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const platform_socket_io_1 = require("@nestjs/platform-socket.io");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.useWebSocketAdapter(new platform_socket_io_1.IoAdapter(app));
    app.enableCors({ origin: '*' });
    await app.listen(3000);
    console.log('CHIMERA API  → http://localhost:3000');
    console.log('WebSocket    → ws://localhost:3000');
}
bootstrap();
//# sourceMappingURL=main.js.map