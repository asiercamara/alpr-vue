import js from '@eslint/js'
import ts from 'typescript-eslint'
import vue from 'eslint-plugin-vue'
import prettier from 'eslint-config-prettier'
import globals from 'globals'

export default [
  js.configs.recommended,
  ...ts.configs.recommended,
  ...vue.configs['flat/recommended'],
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
  {
    files: ['src/**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
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
  {
    ignores: ['dist/**', 'node_modules/**', 'public/**'],
  },
]
