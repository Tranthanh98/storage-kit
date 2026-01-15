import { describe, it, expect, vi, beforeEach } from "vitest";
import { AmazonS3StorageService } from "./amazonS3StorageService";
import { GoogleCloudStorageService } from "./googleCloudStorageService";
import { DigitalOceanSpacesService } from "./digitalOceanSpacesService";
import { AzureBlobStorageService } from "./azureBlobStorageService";
import { S3Client } from "@aws-sdk/client-s3";
import { BlobServiceClient } from "@azure/storage-blob";

// Mock AWS SDK
vi.mock("@aws-sdk/client-s3", () => {
  return {
    S3Client: vi.fn(),
    PutObjectCommand: vi.fn(),
    GetObjectCommand: vi.fn(),
    DeleteObjectCommand: vi.fn(),
    DeleteObjectsCommand: vi.fn(),
    ListObjectsV2Command: vi.fn(),
    HeadBucketCommand: vi.fn(),
  };
});

// Mock Azure SDK
vi.mock("@azure/storage-blob", () => {
  return {
    BlobServiceClient: {
      fromConnectionString: vi.fn().mockReturnValue({
        getContainerClient: vi.fn(),
      }),
    },
    StorageSharedKeyCredential: vi.fn(),
  };
});

describe("Cloud Providers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("AmazonS3StorageService", () => {
    it("should initialize S3Client with correct config", () => {
      new AmazonS3StorageService({
        region: "us-west-2",
        accessKeyId: "test-key",
        secretAccessKey: "test-secret",
      });

      expect(S3Client).toHaveBeenCalledWith(
        expect.objectContaining({
          region: "us-west-2",
          credentials: {
            accessKeyId: "test-key",
            secretAccessKey: "test-secret",
          },
        })
      );
    });
  });

  describe("GoogleCloudStorageService", () => {
    it("should initialize S3Client with GCS endpoint", () => {
      new GoogleCloudStorageService({
        accessKeyId: "gcs-key",
        secretAccessKey: "gcs-secret",
      });

      expect(S3Client).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: "https://storage.googleapis.com",
          credentials: {
            accessKeyId: "gcs-key",
            secretAccessKey: "gcs-secret",
          },
          forcePathStyle: true,
        })
      );
    });
  });

  describe("DigitalOceanSpacesService", () => {
    it("should initialize S3Client with Spaces endpoint", () => {
      new DigitalOceanSpacesService({
        endpoint: "https://nyc3.digitaloceanspaces.com",
        accessKeyId: "do-key",
        secretAccessKey: "do-secret",
      });

      expect(S3Client).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: "https://nyc3.digitaloceanspaces.com",
          credentials: {
            accessKeyId: "do-key",
            secretAccessKey: "do-secret",
          },
          forcePathStyle: false,
        })
      );
    });
  });

  describe("AzureBlobStorageService", () => {
    it("should initialize BlobServiceClient with connection string", () => {
      new AzureBlobStorageService({
        type: "azure",
        connectionString: "DefaultEndpointsProtocol=https;AccountName=test;AccountKey=key;EndpointSuffix=core.windows.net",
      });

      expect(BlobServiceClient.fromConnectionString).toHaveBeenCalledWith(
        "DefaultEndpointsProtocol=https;AccountName=test;AccountKey=key;EndpointSuffix=core.windows.net"
      );
    });
  });
});
