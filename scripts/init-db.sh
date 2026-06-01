#!/bin/bash
# Creates the test database alongside the main one.
# Runs only on first Docker volume init.
set -e
psql -U "$POSTGRES_USER" -c "CREATE DATABASE familydex_test;"
echo "familydex_test created"
