'use strict';
import js from '@eslint/js';
import globals from 'globals';
import configPrettier from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  configPrettier,
  {
    files: ['**/*.js'],
		ignores: [
      '**/node_modules/*',
      'index-test.js'
    ],
    languageOptions: {
      ecmaVersion: 'latest',
			sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.nodeBuiltin
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        allowImportExportEverywhere: false,
        ecmaFeatures: {
          globalReturn: true,
          arrowFunctions: true,
          modules: true,
        },
      },
    },
    rules: {
      'keyword-spacing': ['error', { before: true }],
      'no-var': 'error',
      'prefer-const': ['error', { destructuring: 'all' }],
      'prefer-promise-reject-errors': 'error',
      'prefer-regex-literals': ['error', { disallowRedundantWrapping: true }],
      quotes: [
        'error',
        'single',
        { avoidEscape: true, allowTemplateLiterals: false },
      ],
      'space-before-blocks': ['error', 'always'],
    },
  },
]
