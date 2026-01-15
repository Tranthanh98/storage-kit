/**
 * Storage Kit Module
 *
 * NestJS module for Storage Kit integration.
 */

import { Module, DynamicModule, Provider, type InjectionToken } from "@nestjs/common";
import {
  BaseStorageKit,
  StorageHandler,
  type IStorageService,
  type IStorageKitService,
  DEFAULT_MAX_FILE_SIZE,
} from "@storage-kit/core";
import { MulterModule } from "@nestjs/platform-express";
import {
  type NestJSStorageKitConfig,
  type StorageKitAsyncOptions,
  type StorageKitOptionsFactory,
  type SwaggerOptions,
  STORAGE_KIT_CONFIG,
  STORAGE_KIT_SERVICE,
  STORAGE_KIT_HANDLER,
  STORAGE_KIT_INSTANCE,
} from "./config";
import { StorageKitService } from "./service";
import { StorageKitController } from "./controller";
import { StorageErrorFilter } from "./filter";

/**
 * Normalize swagger configuration to SwaggerOptions.
 */
function normalizeSwaggerConfig(swagger?: boolean | SwaggerOptions): Required<SwaggerOptions> {
  if (swagger === false) {
    return { enabled: false, path: "/reference", title: "Storage Kit API Reference", description: "S3-compatible storage operations API" };
  }
  if (swagger === true || swagger === undefined) {
    return { enabled: true, path: "/reference", title: "Storage Kit API Reference", description: "S3-compatible storage operations API" };
  }
  return {
    enabled: swagger.enabled !== false,
    path: swagger.path || "/reference",
    title: swagger.title || "Storage Kit API Reference",
    description: swagger.description || "S3-compatible storage operations API",
  };
}

/**
 * Storage Kit module for NestJS.
 *
 * Provides storage operations via controller and injectable service.
 * Swagger UI is available at the configured path (default: /reference).
 *
 * @example
 * ```typescript
 * import { Module } from "@nestjs/common";
 * import { StorageKitModule } from "@storage-kit/nestjs";
 *
 * @Module({
 *   imports: [
 *     StorageKitModule.forRoot({
 *       provider: "minio",
 *       endpoint: "http://localhost:9000",
 *       accessKeyId: "minioadmin",
 *       secretAccessKey: "minioadmin",
 *     }),
 *   ],
 * })
 * export class AppModule {}
 *
 * // In main.ts, call setupSwagger after creating the app:
 * import { StorageKitModule } from "@storage-kit/nestjs";
 *
 * async function bootstrap() {
 *   const app = await NestFactory.create(AppModule);
 *   StorageKitModule.setupSwagger(app);
 *   await app.listen(3000);
 * }
 * ```
 */
@Module({})
export class StorageKitModule {
  private static swaggerConfig: Required<SwaggerOptions> = {
    enabled: true,
    path: "/reference",
    title: "Storage Kit API Reference",
    description: "S3-compatible storage operations API",
  };

  /**
   * Configure the module synchronously.
   */
  static forRoot(config: NestJSStorageKitConfig): DynamicModule {
    const providers = this.createProviders(config);
    
    // Store swagger config for later use in setupSwagger
    this.swaggerConfig = normalizeSwaggerConfig(config.swagger);

    const module: DynamicModule = {
      module: StorageKitModule,
      imports: [
        MulterModule.register({
          limits: {
            fileSize: config.maxFileSize ?? DEFAULT_MAX_FILE_SIZE,
          },
        }),
      ],
      controllers: [StorageKitController],
      providers: [
        {
          provide: STORAGE_KIT_CONFIG,
          useValue: config,
        },
        ...providers,
        StorageKitService,
        StorageErrorFilter,
      ],
      exports: [StorageKitService, STORAGE_KIT_SERVICE, STORAGE_KIT_HANDLER, STORAGE_KIT_INSTANCE],
    };

    if (config.global) {
      return {
        ...module,
        global: true,
      };
    }

    return module;
  }

  /**
   * Configure the module asynchronously.
   */
  static forRootAsync(options: StorageKitAsyncOptions): DynamicModule {
    const asyncProviders = this.createAsyncProviders(options);

    const module: DynamicModule = {
      module: StorageKitModule,
      imports: [
        ...(options.imports || []),
        MulterModule.registerAsync({
          useFactory: (config: NestJSStorageKitConfig) => ({
            limits: {
              fileSize: config.maxFileSize ?? DEFAULT_MAX_FILE_SIZE,
            },
          }),
          inject: [STORAGE_KIT_CONFIG],
        }),
      ],
      controllers: [StorageKitController],
      providers: [
        ...asyncProviders,
        ...this.createAsyncServiceProviders(),
        StorageKitService,
        StorageErrorFilter,
      ],
      exports: [StorageKitService, STORAGE_KIT_SERVICE, STORAGE_KIT_HANDLER, STORAGE_KIT_INSTANCE],
    };

    if (options.global) {
      return {
        ...module,
        global: true,
      };
    }

    return module;
  }

  /**
   * Setup Swagger UI for the NestJS application.
   * Call this in your main.ts after creating the app.
   *
   * @param app - NestJS INestApplication instance
   * @param options - Optional swagger options to override module config
   *
   * @example
   * ```typescript
   * import { NestFactory } from "@nestjs/core";
   * import { StorageKitModule } from "@storage-kit/nestjs";
   * import { AppModule } from "./app.module";
   *
   * async function bootstrap() {
   *   const app = await NestFactory.create(AppModule);
   *   StorageKitModule.setupSwagger(app);
   *   await app.listen(3000);
   * }
   * bootstrap();
   * ```
   */
  static setupSwagger(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    app: any,
    options?: SwaggerOptions
  ): void {
    const config = options ? normalizeSwaggerConfig(options) : this.swaggerConfig;

    if (!config.enabled) {
      return;
    }

    try {
      // Dynamic import to avoid requiring @nestjs/swagger if swagger is disabled
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { SwaggerModule, DocumentBuilder } = require("@nestjs/swagger");

      const documentConfig = new DocumentBuilder()
        .setTitle(config.title)
        .setDescription(config.description)
        .setVersion("1.0.0")
        .addTag("storage", "File storage operations")
        .build();

      const document = SwaggerModule.createDocument(app, documentConfig, {
        include: [StorageKitModule],
      });

      SwaggerModule.setup(config.path.replace(/^\//, ""), app, document, {
        customSiteTitle: config.title,
        customCss: `
          .swagger-ui .topbar { display: none }
          .swagger-ui .info .title { font-size: 2rem }
        `,
        swaggerOptions: {
          persistAuthorization: true,
          displayRequestDuration: true,
        },
      });
    } catch (error) {
      console.warn("Failed to setup Swagger UI:", error);
    }
  }

  /**
   * Create synchronous providers.
   */
  private static createProviders(config: NestJSStorageKitConfig): Provider[] {
    // Create StorageKit instance which handles both single and multi-provider modes
    const storageKit = new BaseStorageKit(config);
    const storage = config.storage ?? storageKit.storage;
    const handler = new StorageHandler(storage, config);

    return [
      {
        provide: STORAGE_KIT_INSTANCE,
        useValue: storageKit,
      },
      {
        provide: STORAGE_KIT_SERVICE,
        useValue: storage,
      },
      {
        provide: STORAGE_KIT_HANDLER,
        useValue: handler,
      },
    ];
  }

  /**
   * Create asynchronous providers for config.
   */
  private static createAsyncProviders(
    options: StorageKitAsyncOptions
  ): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncConfigProvider(options)];
    }

    if (options.useClass) {
      return [
        this.createAsyncConfigProvider(options),
        {
          provide: options.useClass,
          useClass: options.useClass,
        },
      ];
    }

    return [];
  }

  /**
   * Create async config provider.
   */
  private static createAsyncConfigProvider(
    options: StorageKitAsyncOptions
  ): Provider {
    if (options.useFactory) {
      return {
        provide: STORAGE_KIT_CONFIG,
        useFactory: options.useFactory,
        inject: (options.inject || []) as InjectionToken[],
      };
    }

    const inject = options.useExisting || options.useClass;
    if (!inject) {
      throw new Error("Invalid async options");
    }

    return {
      provide: STORAGE_KIT_CONFIG,
      useFactory: async (optionsFactory: StorageKitOptionsFactory) =>
        await optionsFactory.createStorageKitOptions(),
      inject: [inject],
    };
  }

  /**
   * Create service providers from async config.
   */
  private static createAsyncServiceProviders(): Provider[] {
    return [
      {
        provide: STORAGE_KIT_INSTANCE,
        useFactory: (config: NestJSStorageKitConfig): IStorageKitService => {
          return new BaseStorageKit(config);
        },
        inject: [STORAGE_KIT_CONFIG],
      },
      {
        provide: STORAGE_KIT_SERVICE,
        useFactory: (
          storageKit: IStorageKitService,
          config: NestJSStorageKitConfig
        ): IStorageService => {
          return config.storage ?? storageKit.storage;
        },
        inject: [STORAGE_KIT_INSTANCE, STORAGE_KIT_CONFIG],
      },
      {
        provide: STORAGE_KIT_HANDLER,
        useFactory: (
          storage: IStorageService,
          config: NestJSStorageKitConfig
        ): StorageHandler => {
          return new StorageHandler(storage, config);
        },
        inject: [STORAGE_KIT_SERVICE, STORAGE_KIT_CONFIG],
      },
    ];
  }
}
