const { z } = require('zod');

const updateProfileSchema = z.object({
  name:     z.string().min(2).optional(),
  username: z.string().min(3).regex(/^[a-zA-Z0-9_]+$/).optional(),
  email:    z.string().email().optional(),
  phone:    z.string().optional(),
  address:  z.string().min(10).optional(),
  avatar:   z.string().url().optional().or(z.literal('')),
  age:      z.number().int().min(18).max(100).optional(),
});

const updateSettingsSchema = z.object({
  theme:    z.string().optional(),
  language: z.string().optional(),
  notifications: z.object({
    email: z.boolean().optional(),
    sms:   z.boolean().optional(),
    push:  z.boolean().optional(),
  }).optional(),
});

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/\d/),
});

module.exports = { updateProfileSchema, updateSettingsSchema, updatePasswordSchema };
export {};
