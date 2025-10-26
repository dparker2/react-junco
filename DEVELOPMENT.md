## Development

### Prerequisites

- [Bun](https://bun.sh) 1.0+

### Setup

Install Bun if you haven't already:
```bash
curl -fsSL https://bun.sh/install | bash
```

Install dependencies:
```bash
bun install
```

### Available Scripts

- `bun run build` - Build the package
- `bun run dev` - Build in watch mode
- `bun test` - Run tests
- `bun run test:ci` - Run tests with coverage
- `bun run lint` - Run ESLint
- `bun run lint:fix` - Fix ESLint issues
- `bun run type-check` - Run TypeScript type checking

## Publishing

### Prerequisites for Publishing

1. **NPM Account**: Create an account at [npmjs.com](https://www.npmjs.com)
2. **Login**: Authenticate with npm registry:
   ```bash
   npm login
   ```
   Note: Bun uses npm's registry and authentication, so you still use `npm login`
3. **Repository**: Ensure your code is pushed to GitHub

### Publishing Steps

1. **Update Version**: Update the version in `package.json` manually or use npm version:
   ```bash
   npm version patch  # for bug fixes
   npm version minor  # for new features
   npm version major  # for breaking changes
   ```

2. **Build & Test**: The `prepublishOnly` script will automatically run build, test, and lint:
   ```bash
   bun run build
   bun test
   bun run lint
   bun run type-check
   ```

3. **Publish**: Publish to npm using Bun:
   ```bash
   bun publish
   ```
   Or use npm directly:
   ```bash
   npm publish
   ```

4. **Push Tags**: Push version tags to GitHub:
   ```bash
   git push origin main --tags
   ```

### Pre-publish Checklist

- [ ] All tests pass (`bun test`)
- [ ] Linting passes (`bun run lint`)
- [ ] Type checking passes (`bun run type-check`)
- [ ] Version number updated
- [ ] CHANGELOG.md updated (if applicable)
- [ ] README.md is up to date
- [ ] Built package is correct (`bun run build`)

### Publishing Scopes

If you want to publish under a scoped package (e.g., `@yourusername/react-junco`):

1. Update the `name` field in `package.json` to `@yourusername/react-junco`
2. Add `"publishConfig": { "access": "public" }` to `package.json` for public scoped packages
3. Use `bun publish --access public` or `npm publish --access public` when publishing

### Why Bun?

This package uses Bun for development because it provides:
- **Fast package installation**: Up to 25x faster than npm
- **Built-in test runner**: No need for separate testing frameworks
- **TypeScript support**: Native TypeScript execution without transpilation
- **npm compatibility**: Still publishes to npm and works with all npm clients
