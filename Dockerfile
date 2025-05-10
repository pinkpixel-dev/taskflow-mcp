FROM node:20-slim

WORKDIR /app
COPY . .
RUN npm install

# Start the server using our entry point
CMD ["node", "server.js"]