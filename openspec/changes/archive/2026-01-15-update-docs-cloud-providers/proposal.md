# Change: Update Documentation for Cloud Providers

## Why
We have added support for Amazon S3, Google Cloud Storage, Azure Blob Storage, and DigitalOcean Spaces. The documentation needs to be updated to reflect these new capabilities and guide users on how to configure them.

## What Changes
- Update `docs/guide/introduction.md`: List all supported providers.
- Update `docs/api/providers.md`: Add configuration examples for new providers.
- Update `docs/guide/installation.md`: Ensure dependencies are clear (e.g., core includes azure sdk now).

## Impact
- **Affected specs**: `docs` capability (tracking documentation state).
- **Affected code**: `docs/*.md` files.
