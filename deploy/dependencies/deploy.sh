#!/bin/bash

echo "Install dependencies"

yum update -y
yum install docker -y
systemctl start docker
systemctl enable docker
usermod -aG docker $USER
newgrp docker

sudo mkdir -p /usr/local/lib/docker/cli-plugins/
DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep tag_name | cut -d '"' -f 4)
sudo curl -L "https://github.com/docker/compose/releases/download/$DOCKER_COMPOSE_VERSION/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
docker compose version

mkdir -p /dependencies
cd /dependencies

cat <<EOF > docker-compose.yml
services:
  epicstory-postgres:
    image: postgres:14
    container_name: epicstory-postgres
    restart: always
    ports:
      - 5432:5432
    volumes:
      - epicstory-postgres:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=\$POSTGRES_DB
      - POSTGRES_USER=\$POSTGRES_USER
      - POSTGRES_PASSWORD=\$POSTGRES_PASSWORD
  epicstory-pgadmin:
    image: dpage/pgadmin4
    container_name: epicstory-pgadmin
    restart: always
    ports:
      - 3300:3300
    volumes:
      - epicstory-pgadmin:/var/lib/pgadmin
    environment:
      - PGADMIN_DEFAULT_EMAIL=\$PGADMIN_DEFAULT_EMAIL
      - PGADMIN_DEFAULT_PASSWORD=\$PGADMIN_DEFAULT_PASSWORD
      - PGADMIN_LISTEN_PORT=\$PGADMIN_LISTEN_PORT
  epicstory-peerjs:
    image: peerjs/peerjs-server
    command: peerjs -p 3001
    restart: always
    ports:
      - 3001:3001
  epicstory-redis:
    image: redis:7
    restart: always
    ports:
      - 6379:6379

volumes:
  epicstory-postgres:
    name: epicstory-postgres
  epicstory-pgadmin:
    name: epicstory-pgadmin
EOF

export POSTGRES_DB=${POSTGRES_DB}
export POSTGRES_USER=${POSTGRES_USER}
export POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
export PGADMIN_DEFAULT_EMAIL=${PGADMIN_DEFAULT_EMAIL}
export PGADMIN_DEFAULT_PASSWORD=${PGADMIN_DEFAULT_PASSWORD}
export PGADMIN_LISTEN_PORT=${PGADMIN_LISTEN_PORT}

echo POSTGRES_DB=${POSTGRES_DB}
echo POSTGRES_USER=${POSTGRES_USER}
echo POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
echo PGADMIN_DEFAULT_EMAIL=${PGADMIN_DEFAULT_EMAIL}
echo PGADMIN_DEFAULT_PASSWORD=${PGADMIN_DEFAULT_PASSWORD}
echo PGADMIN_LISTEN_PORT=${PGADMIN_LISTEN_PORT}

echo $(pwd)

echo docker compose file: $(ls -la docker-compose.yml)

echo "docker compose"

docker compose up -d
