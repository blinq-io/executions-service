FROM mcr.microsoft.com/playwright:v1.52.0-jammy

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm install -g typescript && npm install

COPY . .

RUN chmod +x environment-setup.sh start.sh

RUN tsc src/agent-entry.ts

CMD ["./start.sh"]