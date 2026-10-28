FROM oven/bun:1.3.14
RUN apt-get update \
    && apt-get install -y --no-install-recommends git openssh-client ca-certificates \
    && rm -rf /var/lib/apt/lists/*
ARG APP_UID=0
ARG APP_GID=0
RUN if [ "$APP_UID" != "0" ]; then \
        getent group "$APP_GID" >/dev/null || groupadd -g "$APP_GID" app; \
        getent passwd "$APP_UID" >/dev/null || useradd -u "$APP_UID" -g "$APP_GID" -M -d /tmp -s /usr/sbin/nologin app; \
    fi
WORKDIR /bot_machine
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
WORKDIR /app
ENV APP_ROOT=/app
EXPOSE 4100
CMD ["bun", "/bot_machine/supervisor/start.ts"]
