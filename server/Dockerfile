FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY dist/ ./dist/
ENV PORT=3001
EXPOSE 3001
CMD ["node", "dist/index.js"]
