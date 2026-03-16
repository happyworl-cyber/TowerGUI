{
  "name": "{{PROJECT_NAME}}",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "build": "node build.mjs",
    "watch": "node build.mjs --watch",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@tower-ui/core": "workspace:*",
    "@tower-ui/unity-adapter": "workspace:*",
    "react": "^18.3.1",
    "react-reconciler": "^0.29.2"
  },
  "devDependencies": {
    "@types/react": "^18.3.18",
    "esbuild": "^0.25.0",
    "typescript": "^5.7.0"
  }
}
