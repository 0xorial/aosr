/** @type {import('@ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['jest-expect-message'],
  collectCoverageFrom: ['src/**/*.ts*'],
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'node', 'd.ts'],
  roots: ['<rootDir>/tests/'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    'src/lang/locale/',
    'src/constants',
    'src/icons',
    'src/declarations.d.ts',
    'build',
  ],
  coverageDirectory: 'coverage',
  collectCoverage: true,
};
