module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.spec.ts', '**/?(*.)+(spec|test).ts'],
  testPathIgnorePatterns: ['<rootDir>/src/__tests__/setup.ts'],
  testTimeout: 600000, // 10 minutes for memory-intensive tests
  maxWorkers: 1, // Use single worker to prevent memory conflicts
  workerIdleMemoryLimit: '2GB', // Force worker restart when memory exceeds limit
  // Additional Jest options for memory management
  detectOpenHandles: true,
  forceExit: true,
  logHeapUsage: true,
  runInBand: true, // Run tests serially to prevent memory conflicts
  // Node.js options for better memory handling
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  testEnvironment: 'node',
  testEnvironmentOptions: {
     node: {
       options: '--max-old-space-size=8192 --expose-gc --optimize-for-size'
     }
   },
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleDirectories: ['node_modules', 'src'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))',
  ],
  extensionsToTreatAsEsm: [],
  globals: {
    'ts-jest': {
      useESM: false,
      tsconfig: 'tsconfig.json',
      diagnostics: {
        ignoreCodes: [1343],
      },
      isolatedModules: true,
    },
  },

  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};