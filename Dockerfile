FROM node:18-alpine

ARG SHOPIFY_API_KEY
ENV SHOPIFY_API_KEY=$SHOPIFY_API_KEY
EXPOSE 8081
WORKDIR /app
COPY web .
RUN npm install
RUN cd frontend && npm install && \
    cd node_modules/@shopify/app-bridge-core && \
    for dir in actions actions/Modal actions/Navigation actions/Menu actions/Link; do \
      if [ -d "$dir" ]; then \
        for item in "$dir"/*/; do \
          [ -d "$item" ] && [ ! -f "$item/index.js" ] && echo "module.exports = require('./');" > "$item/index.js"; \
        done; \
        for item in "$dir"/*.js; do true; done; \
      fi; \
    done && \
    cd /app/frontend && npm run build
CMD ["npm", "run", "serve"]
