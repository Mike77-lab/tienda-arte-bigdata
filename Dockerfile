FROM node:20-bookworm-slim

# Instalar Python 3, pip, Java 17 y procps (comando ps requerido por Spark)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    default-jre-headless \
    procps \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar todo el proyecto
COPY . .

# Instalar dependencias de Node.js en backend
RUN cd backend && npm install

# Instalar PySpark en Python
RUN pip3 install --no-cache-dir --break-system-packages -r backend/python/requirements.txt

EXPOSE 3000

CMD ["node", "backend/src/server.js"]