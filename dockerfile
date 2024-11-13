FROM node:22-alpine
WORKDIR /app

COPY . .

RUN npm install 

EXPOSE 8004

CMD ["npm", "run", "example:start"]
