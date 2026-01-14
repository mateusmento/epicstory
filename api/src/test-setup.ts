// Jest setup file to configure test timeouts
// - CI/Production: 60 seconds (reasonable timeout)
// - Debug mode: 24 hours (allows pausing at breakpoints)

const isDebugging =
  process.env.NODE_ENV !== 'production' &&
  (process.env.JEST_DEBUG === 'true' ||
    process.execArgv.some(
      (arg) => arg.includes('--inspect') || arg.includes('--inspect-brk'),
    ) ||
    process.debugPort !== undefined);

if (isDebugging) {
  // 24 hours for debugging sessions
  jest.setTimeout(86400000);
} else {
  // 60 seconds for CI and normal test runs
  jest.setTimeout(60000);
}
