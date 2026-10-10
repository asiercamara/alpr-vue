import js from '@eslint/js'
import ts from 'typescript-eslint'
import vue from 'eslint-plugin-vue'
import prettier from 'eslint-config-prettier'
import globals from 'globals'
import security from 'eslint-plugin-security'

export default [
  js.configs.recommended,
  ...ts.configs.recommended,
  ...vue.configs['flat/recommended'],
  security.configs.recommended,
  prettier,
  // Configuración para archivos .ts y .vue (código fuente)
  {
    files: ['src/**/*.ts', 'src/**/*.vue'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-explicit-any': 'error',
      'vue/block-order': ['error', { order: ['template', 'script', 'style'] }],
      'vue/component-name-in-template-casing': ['error', 'PascalCase'],
      // Catch vacíos intencionados deben llevar comentario
      'no-empty': ['error', { allowEmptyCatch: false }],
    },
  },
  // Configuración para archivos Vue (parser)
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: ts.parser,
      },
    },
  },
  // Relajar reglas en archivos de test — los mocks legítimamente usan `any`
  // y los componentes helper de test se definen múltiples por archivo
  {
    files: ['src/**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'vue/one-component-per-file': 'off',
    },
  },
  // Configuración para workers TypeScript (entorno WebWorker)
  // Usamos globals.browser porque todos los globals de browser están disponibles en workers
  {
    files: ['src/workers/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-explicit-any': 'error',
      'no-empty': ['error', { allowEmptyCatch: false }],
    },
  },
  // VitePress docs theme components — browser environment (Vue + JS, no TypeScript strict)
  {
    files: ['docs/.vitepress/**/*.vue', 'docs/.vitepress/**/*.js', 'docs/.vitepress/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'vue/block-order': ['error', { order: ['template', 'script', 'style'] }],
    },
  },
  // Scripts de Node, configs, E2E y tests que leen ficheros del repo (entorno Node)
  {
    files: ['scripts/**/*.mjs', '*.config.ts', 'e2e/**/*.ts', 'src/tests/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    rules: {
      // Las rutas se derivan de la raíz del proyecto, no de entrada externa
      'security/detect-non-literal-fs-filename': 'off',
    },
  },
  // detect-object-injection da demasiados falsos positivos con índices tipados
  {
    rules: {
      'security/detect-object-injection': 'off',
    },
  },
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      'public/**',
      'docs/.vitepress/dist/**',
      'docs/.vitepress/cache/**',
      'docs/vtdoc-merged/**',
      '.agents/**',
      '.claude/**',
      '.playwright*/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
]
