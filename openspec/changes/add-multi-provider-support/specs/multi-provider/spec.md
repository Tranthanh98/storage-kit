## ADDED Requirements

### Requirement: Multi-Provider Configuration
The system SHALL support configuring multiple storage providers in a single StorageKit instance via a `providers` configuration map.

#### Scenario: Configure multiple providers at initialization
- **WHEN** a StorageKit instance is created with a `providers` map containing configurations for "minio" and "cloudflare-r2"
- **AND** the `provider` field is set to "minio" as the default
- **THEN** both provider services are initialized
- **AND** the default provider is set to "minio"

#### Scenario: Single-provider backward compatibility
- **WHEN** a StorageKit instance is created with only `provider` and inline credentials (no `providers` map)
- **THEN** the system behaves identically to the current single-provider implementation
- **AND** no breaking changes occur

#### Scenario: Invalid provider configuration
- **WHEN** a StorageKit instance is created with a `providers` map
- **AND** the `provider` (default) field references a key not present in `providers`
- **THEN** the system SHALL throw a configuration error at initialization

### Requirement: Provider Switching via useProvider
The system SHALL provide a `useProvider(providerName)` method that returns a provider-scoped StorageKit instance for performing operations against a specific provider.

#### Scenario: Switch to configured provider
- **WHEN** `storageKit.useProvider("cloudflare-r2")` is called
- **AND** "cloudflare-r2" was configured in the `providers` map
- **THEN** the returned instance performs all storage operations using the Cloudflare R2 provider
- **AND** the original storageKit instance remains unchanged

#### Scenario: Switch to unconfigured provider
- **WHEN** `storageKit.useProvider("unknown-provider")` is called
- **AND** "unknown-provider" was NOT configured in the `providers` map
- **THEN** the system SHALL throw a `StorageError` with code "PROVIDER_ERROR"
- **AND** the error message indicates the provider is not configured

#### Scenario: Chain operations with switched provider
- **WHEN** `storageKit.useProvider("r2").bucket("images").deleteFile("photo.jpg")` is called
- **THEN** the delete operation executes against the R2 provider
- **AND** targets the "images" bucket

### Requirement: Default Provider Operations
The system SHALL use the default provider for all operations when `useProvider()` is not called.

#### Scenario: Operations without provider switch
- **WHEN** `storageKit.bucket("images").uploadFile(...)` is called without prior `useProvider()`
- **THEN** the operation executes against the default provider specified in configuration

#### Scenario: Default provider after useProvider on different reference
- **WHEN** `const r2Kit = storageKit.useProvider("r2")` is called
- **AND** then `storageKit.bucket("images").uploadFile(...)` is called on the original instance
- **THEN** the upload operation uses the default provider, not R2
- **AND** r2Kit operations continue to use R2

### Requirement: Provider Type Inference
The system SHALL infer the provider type from the configuration shape or an explicit `type` field within each provider configuration.

#### Scenario: Infer provider type from config shape
- **WHEN** a provider configuration includes `endpoint`, `accessKeyId`, and `secretAccessKey`
- **AND** no explicit `type` field is provided
- **THEN** the system SHALL require a `type` field to disambiguate S3-compatible providers

#### Scenario: Explicit provider type
- **WHEN** a provider configuration includes `type: "cloudflare-r2"`
- **THEN** the system uses the Cloudflare R2 storage service regardless of the provider key name
