FROM node:24-alpine

RUN apk add --no-cache python3 make g++ build-base

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
