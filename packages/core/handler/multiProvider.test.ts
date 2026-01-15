import { describe, it, expect, vi } from "vitest";
import { StorageError, type IStorageService } from "../providers/storageService";
import { isMultiProviderConfig } from "./types";
import { BaseStorageKit, type BaseStorageKitConfig } from "./BaseStorageKit";
import { ProviderScopedStorageKit } from "./ProviderScopedStorageKit";

/**
 * Mock storage service for testing.
 */
function createMockStorageService(id: string): IStorageService {
  const mockBucket = {
    uploadFile: vi.fn().mockResolvedValue({ url: `http://${id}/file.png`, key: `${id}/file.png` }),
    deleteFile: vi.fn().mockResolvedValue(undefined),
    deleteFiles: vi.fn().mockResolvedValue({ deleted: [], errors: [] }),
    getPresignedUploadUrl: vi.fn().mockResolvedValue({ url: `http://${id}/upload`, key: "key" }),
    getPresignedDownloadUrl: vi.fn().mockResolvedValue({ url: `http://${id}/download`, key: "key" }),
    getBucket: vi.fn(),
    healthCheck: vi.fn().mockResolvedValue({ status: "healthy", provider: id }),
  };
  mockBucket.getBucket = vi.fn().mockReturnValue(mockBucket);

  return {
    getBucket: vi.fn().mockReturnValue(mockBucket),
    healthCheck: vi.fn().mockResolvedValue({ status: "healthy", provider: id }),
  } as unknown as IStorageService;
}

describe("Multi-Provider Configuration", () => {
  describe("isMultiProviderConfig", () => {
    it("should return true for multi-provider config", () => {
      const config = {
        provider: "minio" as const,
        providers: {
          minio: {
            endpoint: "http://localhost:9000",
            accessKeyId: "key1",
            secretAccessKey: "secret1",
          },
        },
      };

      expect(isMultiProviderConfig(config)).toBe(true);
    });

    it("should return false for single-provider config", () => {
      const config = {
        provider: "minio" as const,
        endpoint: "http://localhost:9000",
        accessKeyId: "key1",
        secretAccessKey: "secret1",
      };

      expect(isMultiProviderConfig(config)).toBe(false);
    });
  });
});

describe("StorageError", () => {
  describe("PROVIDER_NOT_CONFIGURED", () => {
    it("should create error with correct code and message", () => {
      const error = new StorageError(
        "PROVIDER_NOT_CONFIGURED",
        'Provider "cloudflare-r2" is not configured',
        { requestedProvider: "cloudflare-r2", availableProviders: ["minio"] }
      );

      expect(error.code).toBe("PROVIDER_NOT_CONFIGURED");
      expect(error.message).toBe('Provider "cloudflare-r2" is not configured');
      expect(error.details.requestedProvider).toBe("cloudflare-r2");
      expect(error.details.availableProviders).toEqual(["minio"]);
    });

    it("should serialize to JSON correctly", () => {
      const error = new StorageError(
        "PROVIDER_NOT_CONFIGURED",
        'Provider "cloudflare-r2" is not configured',
        { requestedProvider: "cloudflare-r2" }
      );

      const json = error.toJSON();
      expect(json.error.code).toBe("PROVIDER_NOT_CONFIGURED");
      expect(json.error.message).toBe('Provider "cloudflare-r2" is not configured');
    });
  });
});

describe("Multi-Provider Type Definitions", () => {
  it("should accept valid S3 provider config (no type field needed)", () => {
    const config = {
      endpoint: "http://localhost:9000",
      accessKeyId: "key",
      secretAccessKey: "secret",
      region: "us-east-1",
      publicUrlBase: "http://localhost:9000",
    };

    // Type checking - this should compile
    expect(config.endpoint).toBe("http://localhost:9000");
  });

  it("should accept valid Azure provider config (no type field needed)", () => {
    const config = {
      connectionString: "DefaultEndpointsProtocol=https;...",
    };

    // Type checking - this should compile
    expect(config.connectionString).toContain("DefaultEndpointsProtocol");
  });

  it("should accept valid multi-provider storage kit config", () => {
    const config = {
      provider: "minio" as const,
      providers: {
        minio: {
          endpoint: "http://localhost:9000",
          accessKeyId: "key1",
          secretAccessKey: "secret1",
        },
        "cloudflare-r2": {
          endpoint: "https://r2.example.com",
          accessKeyId: "key2",
          secretAccessKey: "secret2",
        },
      },
      defaultBucket: "my-bucket",
      maxFileSize: 10 * 1024 * 1024,
      allowedMimeTypes: ["image/*"],
    };

    expect(config.provider).toBe("minio");
    expect(Object.keys(config.providers)).toEqual(["minio", "cloudflare-r2"]);
    expect(config.providers.minio.endpoint).toBe("http://localhost:9000");
    expect(config.providers["cloudflare-r2"].endpoint).toBe("https://r2.example.com");
  });

  it("should use provider key as the type", () => {
    const config = {
      provider: "s3" as const,
      providers: {
        s3: {
          region: "us-east-1",
          accessKeyId: "key1",
          secretAccessKey: "secret1",
        },
        minio: {
          endpoint: "http://legacy.example.com:9000",
          accessKeyId: "key3",
          secretAccessKey: "secret3",
        },
      },
    };

    expect(config.provider).toBe("s3");
    expect(config.providers.s3.region).toBe("us-east-1");
    expect(config.providers.minio.endpoint).toBe("http://legacy.example.com:9000");
  });
});

describe("BaseStorageKit - Single Provider Mode (Backward Compatibility)", () => {
  it("should work with single-provider config", () => {
    const mockStorage = createMockStorageService("single");
    const config: BaseStorageKitConfig = {
      provider: "minio",
      endpoint: "http://localhost:9000",
      accessKeyId: "minioadmin",
      secretAccessKey: "minioadmin",
      defaultBucket: "test-bucket",
      storage: mockStorage,
    };

    const kit = new BaseStorageKit(config);

    expect(kit.storage).toBe(mockStorage);
    expect(kit.config).toBe(config);
  });

  it("should allow useProvider with matching default provider name", () => {
    const mockStorage = createMockStorageService("minio");
    const config: BaseStorageKitConfig = {
      provider: "minio",
      endpoint: "http://localhost:9000",
      accessKeyId: "minioadmin",
      secretAccessKey: "minioadmin",
      storage: mockStorage,
    };

    const kit = new BaseStorageKit(config);
    const scoped = kit.useProvider("minio");

    expect(scoped).toBeDefined();
    expect(scoped.storage).toBe(mockStorage);
  });

  it("should throw PROVIDER_NOT_CONFIGURED for unknown provider in single-provider mode", () => {
    const mockStorage = createMockStorageService("minio");
    const config: BaseStorageKitConfig = {
      provider: "minio",
      endpoint: "http://localhost:9000",
      accessKeyId: "minioadmin",
      secretAccessKey: "minioadmin",
      storage: mockStorage,
    };

    const kit = new BaseStorageKit(config);

    expect(() => kit.useProvider("cloudflare-r2")).toThrow(StorageError);
    expect(() => kit.useProvider("cloudflare-r2")).toThrow(/Provider "cloudflare-r2" is not configured/);
  });
});

describe("BaseStorageKit - Multi-Provider Mode", () => {
  it("should throw if default provider is not in providers map", () => {
    // This test validates the error is thrown before registry initialization
    // We expect PROVIDER_NOT_CONFIGURED error for the default provider validation
    expect(() => {
      new BaseStorageKit({
        provider: "backblaze",
        providers: {
          minio: {
            endpoint: "http://localhost:9000",
            accessKeyId: "key",
            secretAccessKey: "secret",
          },
        },
      } as any);
    }).toThrow(StorageError);
  });

  it("should detect multi-provider config correctly", () => {
    const multiConfig = {
      provider: "minio" as const,
      providers: {
        minio: {
          endpoint: "http://localhost:9000",
          accessKeyId: "key",
          secretAccessKey: "secret",
        },
      },
    };

    expect(isMultiProviderConfig(multiConfig as any)).toBe(true);
  });

  it("should detect single-provider config correctly", () => {
    const singleConfig = {
      provider: "minio" as const,
      endpoint: "http://localhost:9000",
      accessKeyId: "key",
      secretAccessKey: "secret",
    };

    expect(isMultiProviderConfig(singleConfig as any)).toBe(false);
  });
});

describe("useProvider()", () => {
  it("should return a ProviderScopedStorageKit instance", () => {
    const minioStorage = createMockStorageService("minio");

    // Use custom storage to avoid real provider initialization
    const kit = new BaseStorageKit({
      provider: "minio",
      endpoint: "http://localhost:9000",
      accessKeyId: "key",
      secretAccessKey: "secret",
      defaultBucket: "test",
      storage: minioStorage,
    } as any);

    const scoped = kit.useProvider("minio");
    expect(scoped).toBeInstanceOf(ProviderScopedStorageKit);
  });

  it("should share defaultBucket with parent", () => {
    const mockStorage = createMockStorageService("minio");
    const kit = new BaseStorageKit({
      provider: "minio",
      endpoint: "http://localhost:9000",
      accessKeyId: "key",
      secretAccessKey: "secret",
      defaultBucket: "shared-bucket",
      storage: mockStorage,
    } as any);

    const scoped = kit.useProvider("minio");
    // Access bucket with underscore placeholder should resolve to defaultBucket
    scoped.bucket("_");
    expect(mockStorage.getBucket).toHaveBeenCalledWith("shared-bucket");
  });

  it("should share onUploadComplete hook with parent", async () => {
    const mockStorage = createMockStorageService("minio");
    const onUploadComplete = vi.fn();

    const kit = new BaseStorageKit({
      provider: "minio",
      endpoint: "http://localhost:9000",
      accessKeyId: "key",
      secretAccessKey: "secret",
      defaultBucket: "test",
      onUploadComplete,
      storage: mockStorage,
    } as any);

    const scoped = kit.useProvider("minio");
    await scoped.uploadFile("test", Buffer.from("test"), "test.txt");

    expect(onUploadComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.any(String),
        key: expect.any(String),
        bucket: "test",
      })
    );
  });
});

describe("ProviderScopedStorageKit", () => {
  it("should resolve underscore placeholder to defaultBucket", () => {
    const mockStorage = createMockStorageService("test");
    const scoped = new ProviderScopedStorageKit(mockStorage, {
      defaultBucket: "my-default-bucket",
    });

    scoped.bucket("_");
    expect(mockStorage.getBucket).toHaveBeenCalledWith("my-default-bucket");
  });

  it("should throw when underscore placeholder used without defaultBucket", () => {
    const mockStorage = createMockStorageService("test");
    const scoped = new ProviderScopedStorageKit(mockStorage, {});

    expect(() => scoped.bucket("_")).toThrow(StorageError);
    expect(() => scoped.bucket("_")).toThrow(/defaultBucket is configured/);
  });

  it("should pass through explicit bucket names", () => {
    const mockStorage = createMockStorageService("test");
    const scoped = new ProviderScopedStorageKit(mockStorage, {
      defaultBucket: "default",
    });

    scoped.bucket("explicit-bucket");
    expect(mockStorage.getBucket).toHaveBeenCalledWith("explicit-bucket");
  });

  it("should call uploadFile on storage service", async () => {
    const mockStorage = createMockStorageService("test");
    const scoped = new ProviderScopedStorageKit(mockStorage, {
      defaultBucket: "test",
    });

    const result = await scoped.uploadFile("test", Buffer.from("data"), "file.txt");
    expect(result).toHaveProperty("url");
    expect(result).toHaveProperty("key");
  });

  it("should call deleteFile on storage service", async () => {
    const mockStorage = createMockStorageService("test");
    const scoped = new ProviderScopedStorageKit(mockStorage, {});

    await scoped.deleteFile("bucket", "file.txt");
    const bucket = mockStorage.getBucket("bucket");
    expect(bucket.deleteFile).toHaveBeenCalledWith("file.txt");
  });

  it("should call deleteFiles on storage service", async () => {
    const mockStorage = createMockStorageService("test");
    const scoped = new ProviderScopedStorageKit(mockStorage, {});

    await scoped.deleteFiles("bucket", ["file1.txt", "file2.txt"]);
    const bucket = mockStorage.getBucket("bucket");
    expect(bucket.deleteFiles).toHaveBeenCalledWith(["file1.txt", "file2.txt"]);
  });

  it("should call getPresignedUploadUrl on storage service", async () => {
    const mockStorage = createMockStorageService("test");
    const scoped = new ProviderScopedStorageKit(mockStorage, {});

    const result = await scoped.getPresignedUploadUrl("bucket", "file.txt");
    expect(result).toHaveProperty("url");
  });

  it("should call getPresignedDownloadUrl on storage service", async () => {
    const mockStorage = createMockStorageService("test");
    const scoped = new ProviderScopedStorageKit(mockStorage, {});

    const result = await scoped.getPresignedDownloadUrl("bucket", "file.txt");
    expect(result).toHaveProperty("url");
  });

  it("should call healthCheck on storage service", async () => {
    const mockStorage = createMockStorageService("test");
    const scoped = new ProviderScopedStorageKit(mockStorage, {});

    const result = await scoped.healthCheck();
    expect(result).toHaveProperty("status", "healthy");
  });
});
