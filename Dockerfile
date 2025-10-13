FROM node:23.7-alpine3.21

ENV REQUEST_TIMEOUT=30000

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install

COPY . .

RUN yarn build

EXPOSE 3000

CMD ["yarn", "serve"] 
