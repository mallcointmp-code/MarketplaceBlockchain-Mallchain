# The Marketplace Backend

## Setup
1. Clone the repo
2. Run `npm install`
3. Copy `.env.example` to `.env` and fill in your secrets
4. Start MongoDB
5. Run `npm start`

## Testing
Run `npm test` to execute all tests in the `tests/` folder.

## API Docs
Visit `/api-docs` for interactive Swagger documentation.

## Folder Structure
- `models/` - Mongoose models
- `routes/` - Express route files
- `middlewares/` - Custom middleware
- `services/` - Business logic
- `utils/` - Utility functions
- `scripts/` - Maintenance scripts
- `tests/` - Automated tests

## Contributing
- Fork and PR
- Write tests for new features
- Document your endpoints

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get paginated products
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Paginated list of products
 */