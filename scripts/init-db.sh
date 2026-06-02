#!/bin/bash
# Creates the test database alongside the main one.
# Runs only on first Docker volume init.
set -e
# Use -d to connect to the main DB (POSTGRES_DB), not to a DB named after the user
psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "CREATE DATABASE familydex_test;"
echo "familydex_test created"
