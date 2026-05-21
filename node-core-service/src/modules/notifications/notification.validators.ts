const { z } = require('zod');

const createInfoSchema = z.object({
  userId:    z.string().min(1),
  type:      z.enum(['info', 'invite']),
  category:  z.string().optional(),
  text:      z.string().min(1),
  teamId:    z.string().optional(),
  senderId:  z.string().optional(),
  path:      z.string().optional(),
});

module.exports = { createInfoSchema };
export {};
