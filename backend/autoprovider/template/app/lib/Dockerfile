FROM mysql:8.0
ENV MYSQL_DATABASE=数据库名 \
    MYSQL_ROOT_PASSWORD=213416e5d7150921
COPY dump.sql /docker-entrypoint-initdb.d/01_dump.sql