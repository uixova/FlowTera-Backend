const { z } = require('zod');

const createTeamSchema = z.object({
  name:     z.string().min(2, 'Takım adı en az 2 karakter olmalıdır.'),
  category: z.string().min(1, 'Kategori zorunludur.'),
  image:    z.string().optional(),
  settings: z.object({
    currency:          z.string().optional(),
    workspaceType:     z.string().optional(),
    privacy:           z.string().optional(),
    maxExpenseLimit:   z.number().optional(),
    memberLimit:       z.number().optional(),
    autoApproved:      z.boolean().optional(),
    autoApprovedLimit: z.number().optional(),
    planContext:       z.any().optional(),
  }).optional(),
});

const updateTeamSchema = z.object({
  name:     z.string().min(2).optional(),
  category: z.string().optional(),
  image:    z.string().optional(),
});

const updateTeamSettingsSchema = z.object({
  currency:          z.string().optional(),
  workspaceType:     z.string().optional(),
  privacy:           z.string().optional(),
  maxExpenseLimit:   z.number().optional(),
  memberLimit:       z.number().optional(),
  status:            z.string().optional(),
  autoApproved:      z.boolean().optional(),
  autoApprovedLimit: z.number().optional(),
});

const updateMemberSchema = z.object({
  roleName:    z.string().min(1, 'Rol adı zorunludur.'),
  permissions: z.array(z.string()).optional(),
});

module.exports = { createTeamSchema, updateTeamSchema, updateTeamSettingsSchema, updateMemberSchema };
export {};
