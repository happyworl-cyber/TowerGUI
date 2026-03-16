{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "sourceMap": true,
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "lib": ["ES2020", "DOM"],
    "outDir": "./output",
    "rootDir": "./src",
    "baseUrl": ".",
    "paths": {
      "csharp": ["./typings/csharp/index.d.ts"],
      "puerts": ["./typings/puerts/index.d.ts"]
    }
  },
  "include": ["src/**/*", "typings/**/*"]
}
