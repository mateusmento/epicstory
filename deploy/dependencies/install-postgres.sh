#!/bin/bash
yum update -y
yum install postgresql15-server -y
postgresql-setup --initdb
systemctl start postgresql
systemctl enable postgresql
systemctl status postgresql

sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" /var/lib/pgsql/data/postgresql.conf
echo "host    all             all             0.0.0.0/0               md5" | sudo tee -a /var/lib/pgsql/data/pg_hba.conf
systemctl restart postgresql

sudo -u postgres psql -c "alter user postgres password 'postgres'"
