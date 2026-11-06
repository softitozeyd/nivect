# syntax=docker/dockerfile:1
FROM node:22-alpine AS web
WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm ci --strict-ssl=true --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM maven:3.9.9-eclipse-temurin-21-alpine@sha256:5a8b906c4faa11d33f6c74758f67db8eac25441e14b0729f6d50ff78992be58a AS build
WORKDIR /build
COPY pom.xml .
COPY src ./src
COPY --from=web /build/src/main/resources/static ./src/main/resources/static
RUN --mount=type=secret,id=proxy_ca \
    set -eu; \
    if [ -f /run/secrets/proxy_ca ]; then \
      cp "$JAVA_HOME/lib/security/cacerts" /tmp/build-cacerts; \
      keytool -importcert -noprompt -alias cloud-proxy -file /run/secrets/proxy_ca \
        -keystore /tmp/build-cacerts -storepass changeit; \
      export MAVEN_OPTS="-Djavax.net.ssl.trustStore=/tmp/build-cacerts"; \
    fi; \
    if [ -n "${HTTPS_PROXY:-}" ]; then \
      proxy_server="${HTTPS_PROXY#*://}"; proxy_host="${proxy_server%:*}"; proxy_port="${proxy_server##*:}"; \
      printf '<settings><proxies><proxy><id>build</id><active>true</active><protocol>http</protocol><host>%s</host><port>%s</port></proxy></proxies></settings>' "$proxy_host" "$proxy_port" > /tmp/maven-settings.xml; \
      mvn -s /tmp/maven-settings.xml -B -ntp verify; \
    else mvn -B -ntp verify; fi; \
    rm -f /tmp/build-cacerts /tmp/maven-settings.xml

FROM eclipse-temurin:21-jre-alpine@sha256:b48e02e0ea88d7bfb305335df94923bdef394905f4147dccd52e873cf17b1088
WORKDIR /app
COPY --from=build /build/target/qc-0.0.1-SNAPSHOT.jar /app/app.jar
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["java", "-XX:ActiveProcessorCount=4", "-jar", "/app/app.jar"]
