## Context

Storage Kit currently creates a single `IStorageService` instance per `BaseStorageKit`. Applications needing multiple providers must create multiple StorageKit instances and manage them externally. This proposal enables a single StorageKit instance to manage multiple provider configurations and switch between them dynamically.

### Stakeholders
- Application developers using Storage Kit with multiple storage backends
- Framework adapter maintainers (Express, Fastify, Hono, NestJS)

### Constraints
- Must maintain backward compatibility with single-provider configuration
- Must not impact performance for single-provider use cases
- Provider switching must be synchronous (no async initialization on switch)

## Goals / Non-Goals

### Goals
- Allow configuring multiple storage providers in a single StorageKit instance
- Provide a clean API to switch between providers for specific operations
- Validate provider availability at switch time
- Maintain full backward compatibility

### Non-Goals
- Cross-provider operations (e.g., copy from MinIO to R2) - out of scope
- Provider health monitoring across all configured providers
- Automatic provider failover

## Decisions

### Decision 1: Lazy vs Eager Provider Initialization
**Decision**: Eager initialization - create all `IStorageService` instances at construction time.

**Rationale**:
- Fail-fast: configuration errors are caught at startup, not at runtime
- No runtime initialization overhead when switching providers
- Simpler implementation without async factory patterns

**Alternatives considered**:
- Lazy initialization: Lower memory if many providers configured but rarely used. Rejected because fail-fast is more valuable for production stability.

### Decision 2: `useProvider()` Return Type
**Decision**: Return a provider-scoped proxy/wrapper that implements the same `IStorageKitService` interface.

**Rationale**:
- Enables chaining: `storageKit.useProvider("r2").bucket("images").deleteFile("key")`
- Immutable: doesn't mutate the main instance state
- Type-safe: TypeScript knows the return type

**Alternatives considered**:
- `setProvider()` that mutates instance state: Rejected due to potential race conditions in async code and unclear semantics
- Return raw `IStorageService`: Rejected because it loses StorageKit-level features like bucket resolution

### Decision 3: Configuration Structure
**Decision**: Use a `providers` map keyed by provider name, with `provider` specifying the default.

```typescript
interface MultiProviderConfig {
  provider: StorageProvider; // Default provider key
  providers: {
    [key: string]: ProviderSpecificConfig;
  };
}
```

**Rationale**:
- Clear separation between default selection and provider configs
- Provider keys are user-defined, allowing custom naming (e.g., "legacy-s3", "new-r2")
- Easy to add/remove providers without restructuring

**Alternatives considered**:
- Array of providers with `default: true` flag: Rejected as less ergonomic for lookups
- Separate config objects per provider at root level (e.g., `minioConfig`, `r2Config`): Rejected as it doesn't scale well and requires knowing all provider names at type level

### Decision 4: Provider Key Naming
**Decision**: Allow any string as provider key, validated against `providers` map at runtime.

**Rationale**:
- Maximum flexibility for user-defined names
- Enables meaningful names like "primary", "backup", "us-east", "eu-west"

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| Memory usage with many providers | Medium | Document that each provider creates an S3/Azure client; suggest limiting to actively used providers |
| Configuration complexity | Low | Maintain single-provider mode for simple use cases; provide clear documentation |
| Type safety for dynamic provider keys | Low | Return type from `useProvider()` is always `IStorageKitService`; throw runtime error for unknown keys |

## Migration Plan

### Backward Compatibility
- Existing single-provider config (`provider` + inline credentials) continues to work unchanged
- When `providers` map is not specified, behavior is identical to current implementation
- No breaking changes to public API

### Rollback
- Feature is additive; removing it only requires removing usage of `providers` and `useProvider()`
- No data migration required

## Open Questions

1. **HTTP API routes**: Should `useProvider()` be exposed via HTTP API (e.g., query param `?provider=r2`)? 
   - Initial stance: No, keep it programmatic-only. HTTP routes use the default provider.
   
2. **Provider aliases**: Should we support aliasing standard provider types (e.g., `{ type: "minio", ... }` within a custom key)?
   - Initial stance: Yes, the provider type is inferred from the config shape or explicit `type` field.
