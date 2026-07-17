import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

async function bootstrap() {
  // Cargar el archivo .env específico
  const envFile = process.env.ENV_FILE || '.env';
  const envPath = path.resolve(process.cwd(), envFile);

  if (fs.existsSync(envPath)) {
    const buffer = fs.readFileSync(envPath);
    // Detectar BOM UTF-16 LE (FF FE) común en PowerShell
    if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
      console.log(
        `Detectada codificación UTF-16 LE en ${envFile}. Leyendo manualmente...`,
      );
      const content = buffer.toString('utf16le').replace(/^\uFEFF/, '');
      const envConfig = dotenv.parse(content);
      for (const k in envConfig) {
        // Solo asignar si la variable no existe ya (Docker tiene prioridad)
        if (!process.env[k]) {
          process.env[k] = envConfig[k];
        }
      }
      console.log(`Archivo de entorno cargado (UTF-16): ${envPath}`);
      console.log(`Variables detectadas: ${Object.keys(envConfig).join(', ')}`);
    } else {
      const result = dotenv.config({ path: envPath });
      if (result.error) {
        console.error(
          `Error cargando archivo .env en: ${envPath}`,
          result.error,
        );
      } else {
        console.log(`Archivo de entorno cargado: ${envPath}`);
        console.log(
          `Variables detectadas: ${Object.keys(result.parsed || {}).join(', ')}`,
        );
      }
    }
  } else {
    console.warn(`No se encontró el archivo de entorno: ${envPath}`);
  }

  // Validar que JWT_SECRET está configurado
  if (!process.env.JWT_SECRET) {
    console.error('CRÍTICO: JWT_SECRET no está configurado en el archivo .env');
    console.error(
      `   Revisa que el archivo ${envPath} contiene JWT_SECRET=<valor>`,
    );
    process.exit(1);
  }

  // Validar otras variables críticas
  const requiredVars = ['PORT', 'SERVER_NAME', 'NEO4J_URI', 'NEO4J_PASSWORD'];
  const missingVars = requiredVars.filter((v) => !process.env[v]);
  if (missingVars.length > 0) {
    console.warn(`Variables no configuradas: ${missingVars.join(', ')}`);
  }

  const app = await NestFactory.create(AppModule);

  // Validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS
  app.enableCors({
    origin: ['https://pixie-front-7ykr.onrender.com'],
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  const serverName = process.env.SERVER_NAME || 'Pixie';
  const serverUrl = process.env.SERVER_URL || `http://localhost:${port}`;
  const jwtSecret = process.env.JWT_SECRET || 'default_secret';

  await app.listen(port, '0.0.0.0');

  console.log(`${serverName} corriendo en ${serverUrl}`);
  console.log(
    `JWT Secret: ${jwtSecret.substring(0, 3)}${'*'.repeat(Math.max(0, jwtSecret.length - 6))}${jwtSecret.substring(jwtSecret.length - 3)}`,
  );
  console.log(`Neo4j URI: ${process.env.NEO4J_URI}`);
}
void bootstrap();
