FROM node:22-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install 

RUN mkdir -p example/ssl
COPY example/ssl/cert.pem example/ssl/key.pem example/ssl/

COPY . .
ENV ENV=prod
EXPOSE 8004
CMD ["npm", "run", "example:start"]
