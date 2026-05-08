FROM docker.io/library/alpine:latest

RUN apk add --no-cache openssh shadow && \
    ssh-keygen -A && \
    addgroup -S sftpusers && \
    mkdir -p /var/run/sshd

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 22

ENTRYPOINT ["/entrypoint.sh"]