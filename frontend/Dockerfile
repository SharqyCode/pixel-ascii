FROM node:24-alpine AS base

    WORKDIR /app

    COPY package*.json . 

    RUN npm install

    COPY  . .

FROM base AS development

    ENV VITE_API_URL=http://localhost:8000

    EXPOSE 5173

    CMD ["npm", "run", "dev"]

FROM base AS build

    WORKDIR /app

    ARG VITE_API_URL=http://localhost:8000

    RUN npm run build

FROM nginx:1.31.8-alpine AS production

    COPY --from=build /app/dist /usr/share/nginx/html

    EXPOSE 80


    
