FROM golang:1.24.1 AS builder

WORKDIR /openbao

COPY scripts ./scripts

WORKDIR /openbao/scripts

RUN go mod download
RUN go mod tidy

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -a -installsuffix cgo -o migrate ./...

FROM openbao/openbao:2.2.1

RUN apk add --no-cache jq curl kubectl

COPY --from=builder /openbao/scripts/migrate /usr/local/bin/migrate

COPY openbao-entrypoint.sh /usr/local/bin/openbao-entrypoint.sh
RUN chmod +x /usr/local/bin/openbao-entrypoint.sh

COPY list_paths.sh /usr/local/bin/list_paths.sh
RUN chmod +x /usr/local/bin/list_paths.sh

RUN mkdir -p /openbao/config /openbao/data

COPY config/openbao.hcl /openbao/config/openbao.hcl
COPY config/openbao.auto.hcl /openbao/config/openbao.auto.hcl
COPY config/openbao.manual.hcl /openbao/config/openbao.manual.hcl
COPY secrets/key.json /openbao/cloud-kms-secrets/key.json

EXPOSE 8200

ENTRYPOINT ["openbao-entrypoint.sh"]
