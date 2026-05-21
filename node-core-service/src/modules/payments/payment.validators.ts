const { z } = require('zod');

const createIntentSchema = z.object({
  planId: z.string().min(1, 'planId zorunludur.'),
});

const simulateSuccessSchema = z.object({
  paymentIntentId: z.string().min(1, 'paymentIntentId zorunludur.'),
});

module.exports = { createIntentSchema, simulateSuccessSchema };
export {};
