FROM node:18

#
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    docker.io \
    curl \
    python3 \
    python3-pip \
    bash \
    && rm -rf /var/lib/apt/lists/*


RUN curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh \
    | sh -s -- -b /usr/local/bin \
    && trivy --version


ARG SONAR_VER=6.2.1.4610
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && SCANNER_ZIP="sonar-scanner-cli-${SONAR_VER}-linux-x64.zip" \
    && wget -qO "/tmp/${SCANNER_ZIP}" \
    "https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/${SCANNER_ZIP}" \
    && unzip -q "/tmp/${SCANNER_ZIP}" -d /opt \
    && mv "/opt/sonar-scanner-${SONAR_VER}-linux-x64" /opt/sonar-scanner \
    && ln -s /opt/sonar-scanner/bin/sonar-scanner /usr/local/bin/sonar-scanner \
    && rm "/tmp/${SCANNER_ZIP}"

WORKDIR /usr/src/app


COPY package*.json ./

RUN npm install express multer unzipper http-proxy-middleware prom-client


COPY . .

VOLUME ["/uploads", "/trivy-results"]

CMD ["npm", "start"]