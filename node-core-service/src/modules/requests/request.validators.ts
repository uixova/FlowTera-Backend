const { z } = require('zod');

const createRequestSchema = z.object({
  category: z.enum(['expense', 'trip', 'team', 'personal']),
  title:    z.string().min(1, 'Başlık zorunludur.').max(200),
  text:     z.string().min(1, 'Detay zorunludur.').max(2000),
  teamId:   z.string().min(1, 'teamId zorunludur.'),
  targetId: z.string().optional(),
  path:     z.string().optional(),
});

const respondSchema = z.object({
  action:           z.enum(['approved', 'rejected']),
  rejectionReason:  z.string().optional(),
}).refine(
  (d: { action: string; rejectionReason?: string }) =>
    d.action !== 'rejected' || (!!d.rejectionReason && d.rejectionReason.trim().length > 0),
  { message: 'Red nedeni zorunludur.', path: ['rejectionReason'] }
);

module.exports = { createRequestSchema, respondSchema };
export {};
