# ============== BUILD STAGE ==============
FROM node:22-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY . .

# Compilar la aplicación
RUN npm run build && echo "✓ Build exitoso" || (echo "✗ Build falló" && exit 1)

# Verificar que el dist fue creado
RUN ls -la /app/dist/ || (echo "✗ dist/ no existe después del build" && exit 1)

# ============== PRODUCTION STAGE ==============
FROM node:22-alpine AS production

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar solo dependencias de producción
RUN npm ci --only=production

# Copiar archivos compilados desde el builder
COPY --from=builder /app/dist ./dist

# Exponer puerto
EXPOSE 3000

# Comando para ejecutar la aplicación
CMD ["node", "dist/src/main"]
