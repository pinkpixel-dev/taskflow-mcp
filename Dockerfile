FROM node:20-slim

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --ignore-scripts

# Copy the rest of the application
COPY . .

# Expose port if needed (optional, as MCP servers might not require it)
EXPOSE 8000

# Run the MCP server
CMD ["node", "dist/index.js"]