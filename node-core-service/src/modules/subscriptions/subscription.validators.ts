const { z } = require('zod');

const upgradeSchema = z.object({
  planId: z.string().min(1, 'planId zorunludur.'),
});

module.exports = { upgradeSchema };
export {};
