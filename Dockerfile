FROM node:lts-alpine

# Download packages
RUN apk --update add --no-cache ca-certificates git imagemagick curl tzdata

COPY package*.json /app/rin-pr/
COPY lib/rin-lite/package*.json /app/rin-pr/lib/rin-lite/
WORKDIR /app/rin-pr/
RUN npm install && cd lib/rin-lite/ && npm install

# Bundle app source
COPY . .
RUN mkdir -p public/data/tmp && chmod 777 -R public/data && chmod 777 public \
  && mkdir -p runtime/logs && chmod 777 -R runtime \
  && mv entrypoint.sh / && chmod +x /entrypoint.sh

EXPOSE 3006

HEALTHCHECK --interval=30s --timeout=2s --start-period=5s \
  CMD ["curl", "--fail", "http://localhost:3006/health"]

ENTRYPOINT ["/entrypoint.sh"]
CMD ["/app/rin-pr/bin/rin-web.js"]
