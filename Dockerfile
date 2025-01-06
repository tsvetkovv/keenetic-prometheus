FROM denoland/deno:2.1.4

EXPOSE 9991

# Create and set working directory
WORKDIR /app

# Create data and config directories
RUN mkdir -p /app/data /app/config

# Cache the dependencies as a layer
COPY deno.json .
RUN deno install

# Copy the rest of the application
COPY . .

# Define volumes for both data and config
VOLUME ["/app/data", "/app/config"]

# Set correct permissions and ownership after copying files
RUN chown -R deno:deno /app && \
    chmod -R 755 /app && \
    chmod 775 /app/data && \
    chmod 775 /app/config && \
    chgrp -R deno /app/data /app/config

USER deno

# Cache the application code
RUN deno cache main.ts

# Set the entrypoint
CMD ["run", "start"] 