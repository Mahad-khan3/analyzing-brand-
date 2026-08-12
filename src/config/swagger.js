const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BrandPilot AI API',
      version: '1.0.0',
      description:
        'AI-powered social media management platform. JWT auth, workspaces, brands, AI generators (Gemini + FLUX/FAL), content scheduling (Redis + BullMQ), social publishing and analytics.',
    },
    servers: [{ url: '/api/v1', description: 'API v1' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: { success: { type: 'boolean' }, message: { type: 'string' }, data: { type: 'object' } },
        },
        ApiError: {
          type: 'object',
          properties: { success: { type: 'boolean' }, message: { type: 'string' }, error: { type: 'string' } },
        },
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' }, name: { type: 'string' }, email: { type: 'string' },
            role: { type: 'string', enum: ['user', 'admin'] }, isVerified: { type: 'boolean' },
            profileImage: { type: 'string' }, createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Workspace: {
          type: 'object',
          properties: {
            _id: { type: 'string' }, name: { type: 'string' }, slug: { type: 'string' },
            owner: { type: 'string' }, description: { type: 'string' }, logo: { type: 'string' },
          },
        },
        Brand: {
          type: 'object',
          properties: {
            _id: { type: 'string' }, workspace: { type: 'string' }, name: { type: 'string' },
            description: { type: 'string' }, website: { type: 'string' }, isStartup: { type: 'boolean' },
            logoUrl: { type: 'string' }, theme: { type: 'string' }, colors: { type: 'object' },
          },
        },
        Content: {
          type: 'object',
          properties: {
            _id: { type: 'string' }, workspace: { type: 'string' }, brand: { type: 'string' },
            title: { type: 'string' }, caption: { type: 'string' }, hashtags: { type: 'array', items: { type: 'string' } },
            platforms: { type: 'array', items: { type: 'string' } },
            status: { type: 'string', enum: ['draft', 'scheduled', 'processing', 'published', 'failed', 'cancelled'] },
            scheduledAt: { type: 'string', format: 'date-time' },
          },
        },
        SocialAccount: {
          type: 'object',
          properties: {
            _id: { type: 'string' }, platform: { type: 'string' }, accountId: { type: 'string' },
            accountName: { type: 'string' }, username: { type: 'string' }, status: { type: 'string' },
          },
        },
        Subscription: {
          type: 'object',
          properties: {
            _id: { type: 'string' }, workspace: { type: 'string' },
            plan: { type: 'string', enum: ['free', 'starter', 'pro', 'agency'] },
            status: { type: 'string' }, limits: { type: 'object' }, usage: { type: 'object' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJSDoc(options);
