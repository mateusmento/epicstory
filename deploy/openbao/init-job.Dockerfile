FROM amazonlinux:2023

RUN yum install -y unzip curl awscli && \
    curl -Lo /tmp/openbao.zip https://github.com/openbao/openbao/releases/latest/download/openbao-linux-amd64.zip && \
    unzip /tmp/openbao.zip -d /usr/local/bin && \
    chmod +x /usr/local/bin/openbao && \
    rm -f /tmp/openbao.zip

ENTRYPOINT ["/bin/sh", "-c"]
