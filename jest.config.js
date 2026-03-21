export default {
  testEnvironment: 'node',
  verbose: true,
  transform: {}, // Ensures ESM support if using native Node imports
  testMatch: ['**/tests/**/*.test.js'],
  setupFilesAfterEnv: ['./tests/setup.js'], // For DB connection helpers
  forceExit: true, // Prevents Jest from hanging due to open DB handles
  clearMocks: true
};