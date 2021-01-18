FROM node:14-alpine

WORKDIR /app

COPY . .

RUN npm install --production

EXPOSE 8080