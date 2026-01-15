## 1. Core Type Definitions

- [x] 1.1 Add `ProviderConfig` type that includes explicit `type` field for provider disambiguation
- [x] 1.2 Add `MultiProviderStorageKitConfig` interface with `providers` map
- [x] 1.3 Update `StorageKitConfig` to be a union of single-provider and multi-provider configs
- [x] 1.4 Add `IProviderScopedStorageKit` interface for the return type of `useProvider()`

## 2. Core Implementation

- [x] 2.1 Create `ProviderRegistry` class to manage multiple `IStorageService` instances
- [x] 2.2 Update `BaseStorageKit` constructor to detect multi-provider config and initialize `ProviderRegistry`
- [x] 2.3 Implement `useProvider(providerName)` method in `BaseStorageKit` returning a provider-scoped wrapper
- [x] 2.4 Add validation for default provider existence in `providers` map
- [x] 2.5 Add "PROVIDER_NOT_CONFIGURED" error code to `StorageErrorCode` type

## 3. Provider-Scoped Wrapper

- [x] 3.1 Create `ProviderScopedStorageKit` class that wraps a specific `IStorageService`
- [x] 3.2 Implement `IStorageKitService` interface on `ProviderScopedStorageKit`
- [x] 3.3 Ensure wrapper shares config (defaultBucket, hooks) with parent StorageKit

## 4. Framework Adapter Updates

- [x] 4.1 Update `ExpressStorageKit` to expose `useProvider()` method
- [x] 4.2 Update `FastifyStorageKit` to expose `useProvider()` method
- [x] 4.3 Update `HonoStorageKit` to expose `useProvider()` method
- [x] 4.4 Update NestJS `StorageKitService` to expose `useProvider()` method

## 5. Testing

- [x] 5.1 Add unit tests for `ProviderRegistry` initialization and lookup
- [x] 5.2 Add unit tests for `useProvider()` with valid and invalid provider names
- [x] 5.3 Add unit tests for backward compatibility with single-provider config
- [x] 5.4 Add integration test demonstrating multi-provider usage pattern

## 6. Documentation

- [x] 6.1 Update README with multi-provider configuration example
- [x] 6.2 Add docs page explaining multi-provider use cases
- [x] 6.3 Document `useProvider()` method in API reference

## Dependencies

- Tasks 2.x depend on 1.x (types must be defined first)
- Tasks 3.x depend on 2.1, 2.2
- Tasks 4.x depend on 2.3, 3.x
- Tasks 5.x can run in parallel after 3.x
- Tasks 6.x can run after 4.x
