# Installing Ignite CLI (Optional - for Blockchain)

The blockchain integration requires Ignite CLI. If you want to use blockchain features, install it:

## Installation

### Option 1: Using curl (Recommended)
```bash
curl https://get.ignite.com/cli! | bash
```

### Option 2: Using Go
```bash
go install github.com/ignite/cli/ignite/cmd/ignite@latest
```

### Option 3: Download Binary
Visit https://github.com/ignite/cli/releases and download the latest release for your platform.

## Verify Installation

```bash
ignite version
```

## After Installing Ignite

Once Ignite is installed, you can run the full stack:

```bash
pnpm run dev:with-blockchain
```

## Without Blockchain

The marketplace works perfectly fine without blockchain. Just use:

```bash
pnpm run dev
```

This runs the marketplace backend, workers, and frontend without the blockchain components.
