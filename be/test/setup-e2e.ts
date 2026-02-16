/**
 * E2E Test Setup
 *
 * This file runs before all E2E tests to configure the test environment.
 * It sets NODE_ENV=test to disable rate limiting and other production behaviors.
 */

// Set NODE_ENV to test before any modules are loaded
process.env.NODE_ENV = 'test';

// Increase rate limiting to effectively disable it in tests
process.env.THROTTLE_TTL = '60000';
process.env.THROTTLE_LIMIT = '100000';
