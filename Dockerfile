FROM node:20-bookworm-slim

# Instalar Python 3, pip y Java 17 (requisito obligatorio para Apache Spark / PySpark)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    default-jre-headless \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar e instalar dependencias de Node.js
COPY backend/package*.json ./backend/
RUN cd backend && npm install

# Copiar e instalar PySpark
COPY backend/python/requirements.txt ./backend/python/
RUN pip3 install --no-cache-dir --break-system-packages -r backend/python/requirements.txt

# Copiar el resto del proyecto (frontend y backend)
COPY . .

EXPOSE 3000

CMD ["node", "backend/src/server.js"]