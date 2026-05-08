FROM docker.io/library/alpine:latest

RUN apk add --no-cache fail2ban ip6tables iptables tzdata && \
    mkdir -p /etc/fail2ban/jail.d /etc/fail2ban/filter.d /var/log/fail2ban

COPY jail.d/   /etc/fail2ban/jail.d/
COPY filter.d/ /etc/fail2ban/filter.d/

# fail2ban writes its socket and pid here
VOLUME ["/var/run/fail2ban"]

# fail2ban requires access to the host log files — mounted read-only at runtime
ENTRYPOINT ["fail2ban-client", "-f", "-x", "start"]