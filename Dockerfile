FROM node:16

USER root

ARG DATABASE_URL=file:./dev.db
ARG JWT_SECRET=super-secret-key-123
ARG ADMIN_PASSWORD=password123

ENV NODE_ENV=production
ENV DATABASE_URL=${DATABASE_URL}
ENV JWT_SECRET=${JWT_SECRET}
ENV ADMIN_PASSWORD=${ADMIN_PASSWORD}
ENV UPLOAD_PATH=/app/uploads

RUN mkdir -p /app/uploads /app/logs /app/config && \
    chmod 777 /app/uploads /app/logs /app/config

WORKDIR /app

COPY . .

RUN npm install

RUN npm install --include=dev

RUN npx prisma generate

RUN npm run build

RUN npx prisma db push --accept-data-loss
RUN npm run prisma:seed

EXPOSE 3000 8080 9229 5432 3306 6379 27017

RUN apt-get update && apt-get install -y openssh-server && \
    echo 'root:password123' | chpasswd && \
    echo 'PermitRootLogin yes' >> /etc/ssh/sshd_config && \
    echo 'PasswordAuthentication yes' >> /etc/ssh/sshd_config

RUN apt-get install -y curl wget netcat-openbsd nmap telnet

RUN cp .env /tmp/env_backup.txt && \
    cp package*.json /tmp/ && \
    chmod 644 /tmp/env_backup.txt

RUN chmod -R 777 /app

RUN echo '#!/bin/bash\n\
echo "Starting vulnerable application..."\n\
echo "Environment: $NODE_ENV"\n\
echo "Database: $DATABASE_URL"\n\
echo "JWT Secret: $JWT_SECRET"\n\
echo "Admin Password: $ADMIN_PASSWORD"\n\
service ssh start\n\
node dist/main.js' > /app/start.sh && \
chmod +x /app/start.sh

CMD ["/app/start.sh"]
