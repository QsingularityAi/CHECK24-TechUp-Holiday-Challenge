/**
 * Main entry point for the Mallorca Travel Backend
 */

// Load environment variables from .env file
import * as dotenv from 'dotenv';
dotenv.config();

import { createApp } from "./app";
import { ApplicationStartup } from "./startup";
import { SystemError, ErrorLogger } from "./middleware";
import { config } from "./config";

async function startServer(): Promise<void> {
  let server: any;
  const pidFile = process.env.PID_FILE || "./mallorca-backend.pid";

  try {
    console.log("Starting Mallorca Travel Backend...");
    console.log(
      `Configuration: Port=${config.port}, LogLevel=${config.logLevel}`,
    );

    const { app, apiController } = createApp();
    const startup = new ApplicationStartup();

    // Write PID file for process management
    const fs = await import("fs");
    try {
      await fs.promises.writeFile(pidFile, process.pid.toString());
      console.log(`PID file created: ${pidFile} (PID: ${process.pid})`);
    } catch (pidError) {
      console.warn(`Warning: Could not create PID file: ${pidError}`);
    }

    // Perform pre-startup health checks
    console.log("Performing health checks...");
    const healthCheck = await startup.performHealthChecks();

    if (!healthCheck.passed) {
      console.warn("Health check issues detected:");
      healthCheck.issues.forEach((issue) => console.warn(`  - ${issue}`));
      console.warn("Continuing startup despite health check issues...");
    }

    // Start the HTTP server first (so it can serve health checks during initialization)
    server = app.listen(config.port, () => {
      console.log(`Server is running on port ${config.port}`);
      console.log(
        `Health check available at: http://localhost:${config.port}/health`,
      );
      console.log(
        `Status endpoint available at: http://localhost:${config.port}/status`,
      );
      console.log(
        "Note: API endpoints will be available after data loading completes",
      );
    });

    // Initialize application data in the background
    console.log("Starting application initialization...");

    try {
      const initResult = await startup.initialize(apiController);

      if (initResult.success) {
        console.log("✅ Application initialization completed successfully!");
        console.log(
          `📊 Data loaded: ${initResult.dataStats.hotels} hotels, ${initResult.dataStats.offers} offers`,
        );
        console.log(
          `⏱️  Initialization time: ${initResult.dataStats.loadTime}ms`,
        );
        console.log(
          `🔍 API endpoints now available at: http://localhost:${config.port}/api`,
        );

        if (initResult.warnings.length > 0) {
          console.warn(
            `⚠️  Initialization completed with ${initResult.warnings.length} warnings:`,
          );
          initResult.warnings.forEach((warning) =>
            console.warn(`   - ${warning}`),
          );
        }
      } else {
        console.error("❌ Application initialization failed!");
        initResult.errors.forEach((error) => console.error(`   - ${error}`));
        console.error(
          "Server will continue running but API functionality will be limited",
        );
        console.error("Check the /health endpoint for current status");
      }
    } catch (initError) {
      const errorMessage =
        initError instanceof Error
          ? initError.message
          : "Unknown initialization error";
      console.error("❌ Critical initialization failure:", errorMessage);

      ErrorLogger.logSystemError(initError as Error, {
        stage: "main_initialization",
        port: config.port,
      });

      if (initError instanceof SystemError && !initError.isOperational) {
        console.error("Non-recoverable error detected. Shutting down...");
        process.exit(1);
      }

      console.error("Server will continue running in degraded mode");
      console.error("Check the /health endpoint for current status");
    }

    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string) => {
      console.log(`Received ${signal}. Starting graceful shutdown...`);

      // Remove PID file
      try {
        const fs = await import("fs");
        await fs.promises.unlink(pidFile);
        console.log("PID file removed");
      } catch (pidError) {
        console.warn(`Warning: Could not remove PID file: ${pidError}`);
      }

      if (server) {
        server.close(() => {
          console.log("HTTP server closed.");
          process.exit(0);
        });

        // Force close after 10 seconds
        setTimeout(() => {
          console.error(
            "Could not close connections in time, forcefully shutting down",
          );
          process.exit(1);
        }, 10000);
      } else {
        process.exit(0);
      }
    };

    // Handle shutdown signals
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    // Enhanced error handling for uncaught exceptions
    process.on("uncaughtException", (error) => {
      console.error("💥 Uncaught Exception:", error);
      ErrorLogger.logSystemError(error, {
        type: "uncaught_exception",
        fatal: true,
      });

      // Try graceful shutdown
      if (server) {
        server.close(() => {
          process.exit(1);
        });

        setTimeout(() => {
          process.exit(1);
        }, 5000);
      } else {
        process.exit(1);
      }
    });

    process.on("unhandledRejection", (reason, promise) => {
      console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
      ErrorLogger.logSystemError(new Error(`Unhandled Rejection: ${reason}`), {
        type: "unhandled_rejection",
        promise: promise.toString(),
      });

      // Don't exit on unhandled rejections, but log them
      console.error(
        "Application will continue running, but this should be investigated",
      );
    });

    // Handle memory warnings
    process.on("warning", (warning) => {
      console.warn("⚠️  Node.js Warning:", warning.name, warning.message);
      if (warning.name === "MaxListenersExceededWarning") {
        console.warn("Consider investigating potential memory leaks");
      }
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown startup error";
    console.error("💥 Failed to start server:", errorMessage);

    ErrorLogger.logSystemError(error as Error, {
      stage: "server_startup",
      port: config.port,
    });

    // Clean up server if it was created
    if (server) {
      server.close();
    }

    process.exit(1);
  }
}

// Start the server
startServer();
