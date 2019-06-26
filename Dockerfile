FROM node:12.4.0-stretch

LABEL maintainer="zekro <contact@zekro.de>"

#### SETUP ####

ENV RUNLOC="/etc/scripts"

WORKDIR /var/webserver

ADD . .

RUN npm install

RUN npm run build

RUN mkdir -p /etc/config &&\
    mkdir -p /etc/certs &&\
    mkdir -p /etc/scripts

#### RUN & EXPOSE ####

EXPOSE 8080

CMD mkdir -p $RUNLOC && \
    npm run start-dry -- \
        --config /etc/config/config.yml \
        --port 8080 \
        --run-location $RUNLOC