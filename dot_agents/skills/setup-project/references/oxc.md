# Oxc

Use Oxlint and Oxfmt for linting and formatting code.

1. Install Oxlint and Oxfmt `pnpm add -ED oxlint oxlint-tsgolint oxfmt`
2. Set Oxfmt as default formatter in `.vscode/settings.json`
   ```json
   {
     "editor.defaultFormatter": "oxc.oxc-vscode"
   }
   ```
3. Create Oxlint and Oxfmt config
   - `.oxlintrc.json`
     ```json
     {
       "options": {
         "typeAware": true,
         "typeCheck": true
       },
       "categories": {
         "correctness": "error",
         "perf": "error"
       }
     }
     ```
   - `.oxfmt.json`
     ```json
     {
       "singleQuote": true,
       "useTabs": true,
       "printWidth": 120
     }
     ```
4. Add scripts to `package.json`
   ```json
   {
     "scripts": {
       "format": "oxfmt --check",
       "format:fix": "oxfmt",
       "lint": "oxlint",
       "lint:fix": "oxlint --fix"
     }
   }
   ```
5. Apply fixes `pnpm format:fix` and `pnpm lint:fix`
