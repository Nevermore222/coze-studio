# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Use aliyun mirror for Alpine packages
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# Install system dependencies
RUN apk add --no-cache bash git dos2unix

# Use official npm registry to avoid missing Rush dependencies
RUN npm config set registry https://registry.npmjs.org

# Copy rush.json first
COPY rush.json ./

# Install Rush CLI from official registry
RUN npm install -g @microsoft/rush --registry=https://registry.npmjs.org

# Copy source code
COPY frontend/ ./frontend/
COPY common/ ./common/
COPY scripts/ ./scripts/

# Fix line endings
RUN find . -name "*.sh" -type f -exec dos2unix {} \;

# Make hook executable and clean temp
RUN chmod +x scripts/hooks/post-rush-install.sh && rm -rf /app/common/temp

# Install dependencies
RUN rush install

# Build the app (NO --no-install — it's invalid!)
RUN rush build --to @coze-studio/app

# Debug: Find all output directories
RUN echo "=== Searching for build output directories ===" && \
    find /app/frontend/apps/coze-studio -type d \( -name "dist" -o -name "output" -o -name "build" \) && \
    echo "=== Listing coze-studio app directory ===" && \
    ls -la /app/frontend/apps/coze-studio/ && \
    echo "=== End debug ==="


# Production stage
FROM nginx:1.25-alpine

RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories
RUN apk add --no-cache bash

# Copy built assets from frontend app directory
COPY --from=builder /app/frontend/apps/coze-studio/dist /usr/share/nginx/html

EXPOSE 8888
CMD ["nginx", "-g", "daemon off;"]