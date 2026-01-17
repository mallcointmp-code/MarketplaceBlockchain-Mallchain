#!/usr/bin/env sh
set -eu

echo "Starting containerized E2E test run"

echo "Formatting..."
gofmt -w . || true

echo "Running vet..."
go vet ./... || true

echo "Running E2E tests (treasury package)..."
go test ./x/treasury/... -v

echo "E2E tests completed"
