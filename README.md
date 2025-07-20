# Loujo

## Development Setup

### Stripe Webhook Testing

To test the Stripe integration in your local environment, run the following command in a **separate terminal**:

./stripe_binary/stripe listen --forward-to localhost:3000/api/webhooks/stripe

### 1. Lint the codebase

npm run lint

### 2. Clean up unused code with knip

npm run clean

### 3. Build the project to ensure everything compiles

npm run build
