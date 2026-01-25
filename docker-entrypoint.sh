#!/bin/sh
# Docker entrypoint for AI Workflow Architect
# Constructs DATABASE_URL from individual components if not already set

if [ -z "$DATABASE_URL" ] && [ -n "$DB_HOST" ]; then
    export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
    echo "Constructed DATABASE_URL from components"
fi

echo "Starting AI Workflow Architect..."
exec node dist/index.cjs
