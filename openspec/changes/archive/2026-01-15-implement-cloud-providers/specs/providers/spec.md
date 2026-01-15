## ADDED Requirements

### Requirement: Amazon S3 Support
The system SHALL support Amazon S3 as a storage provider using native AWS SDK configuration.

#### Scenario: Configure Amazon S3
- **WHEN** the provider is configured with `type: "s3"`, `region`, `accessKeyId`, and `secretAccessKey`
- **THEN** it connects to the official AWS S3 endpoint
- **AND** operations are performed against the specified bucket in that region

### Requirement: Google Cloud Storage Support
The system SHALL support Google Cloud Storage via S3 interoperability mode.

#### Scenario: Configure GCS
- **WHEN** the provider is configured with `type: "gcs"`, `accessKeyId` (HMAC), and `secretAccessKey` (HMAC)
- **THEN** it connects to `storage.googleapis.com`
- **AND** uses path-style addressing or virtual-hosted style as appropriate for GCS

### Requirement: DigitalOcean Spaces Support
The system SHALL support DigitalOcean Spaces via S3 compatibility.

#### Scenario: Configure Spaces
- **WHEN** the provider is configured with `type: "spaces"`, `endpoint` (e.g., `nyc3.digitaloceanspaces.com`), and credentials
- **THEN** it connects to the DigitalOcean endpoint
- **AND** supports Spaces-specific URL formats

### Requirement: Azure Blob Storage Support
The system SHALL support Azure Blob Storage using native Azure authentication.

#### Scenario: Configure Azure with Connection String
- **WHEN** the provider is configured with `type: "azure"` and `connectionString`
- **THEN** it connects to the Azure Blob Storage account
- **AND** operations map to Azure Blob REST API calls

#### Scenario: Configure Azure with Account Key
- **WHEN** the provider is configured with `type: "azure"`, `accountName`, and `accountKey`
- **THEN** it constructs the connection and authenticates successfully
