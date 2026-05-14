#!/bin/sh
set -e

# generate host keys if they don't exist
for key in /etc/ssh/keys/ssh_host_rsa_key /etc/ssh/keys/ssh_host_ed25519_key; do
    if [ ! -f "$key" ]; then
        ssh-keygen -t "${key##*_}" -f "$key" -N "" > /dev/null 2>&1 || true
    fi
done

# copy host keys to sshd location
cp /etc/ssh/keys/* /etc/ssh/ 2>/dev/null || true

# process users.conf — format: username:password:uid
if [ -f /etc/sftp/users.conf ]; then
    while IFS=: read -r username password uid; do
        # skip empty lines and comments
        echo "$username" | grep -qE '^\s*#|^\s*$' && continue
        [ -z "$username" ] && continue

        # create group if it doesn't exist
        getent group "sftp-$username" > /dev/null 2>&1 || addgroup -g "$uid" "sftp-$username"

        # create user if it doesn't exist
        if ! getent passwd "$username" > /dev/null 2>&1; then
            adduser -D -u "$uid" -G "sftp-$username" -s /usr/lib/openssh/sftp-server -h "/home/$username" "$username"
            adduser "$username" sftpusers
        fi

        # set password
        echo "$username:$password" | chpasswd

        # chroot root must be root:root for sshd — only chown the subdirs
        for d in html nginx php-fpm redis db; do
            [ -d "/home/$username/$d" ] && chown -R "$uid:$uid" "/home/$username/$d" 2>/dev/null || true
        done
        chmod 2775 "/home/$username/html" 2>/dev/null || true

    done < /etc/sftp/users.conf
fi

# write sshd config
cat > /etc/ssh/sshd_config << EOF
ListenAddress 0.0.0.0
Port 2222
HostKey /etc/ssh/ssh_host_rsa_key
HostKey /etc/ssh/ssh_host_ed25519_key
PermitRootLogin no
PasswordAuthentication yes
ChallengeResponseAuthentication no
Subsystem sftp internal-sftp
MaxSessions 10
MaxStartups 10:30:100
Match Group sftpusers
    ChrootDirectory /home/%u
    ForceCommand internal-sftp
    X11Forwarding no
    AllowTcpForwarding no
EOF

# apply any additional sshd config from mounted directory
if [ -d /etc/ssh/sshd_config.d ]; then
    cat /etc/ssh/sshd_config.d/*.conf >> /etc/ssh/sshd_config 2>/dev/null || true
fi

exec /usr/sbin/sshd -D -e