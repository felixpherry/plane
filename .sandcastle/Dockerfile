FROM node:22-bookworm

RUN apt-get update && apt-get install -y \
  git \
  curl \
  jq \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

ARG AGENT_UID=1000
ARG AGENT_GID=1000

RUN groupmod -g $AGENT_GID node && usermod -u $AGENT_UID -g $AGENT_GID -d /home/agent -m -l agent node

RUN npm install -g @mariozechner/pi-coding-agent

USER ${AGENT_UID}:${AGENT_GID}

RUN curl https://sh.rustup.rs -sSf | sh -s -- -y
ENV PATH="/home/agent/.cargo/bin:${PATH}"

WORKDIR /home/agent

ENTRYPOINT ["sleep", "infinity"]
