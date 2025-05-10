FROM node:20-slim

# Set working directory to the root of the project
WORKDIR /app

# Copy package files first for better caching
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Expose the port the server will run on
EXPOSE 8000

# Start the server using our entry point
CMD ["node", "server.js"]
