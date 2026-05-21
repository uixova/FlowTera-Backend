const { z } = require('zod');

const loginSchema = z.object({
  email:    z.string().email('Geçerli bir e-posta adresi girin.'),
  password: z.string().min(1, 'Şifre zorunludur.'),
});

const verifySchema = z.object({
  email: z.string().email(),
  code:  z.string().length(6, 'Doğrulama kodu 6 haneli olmalıdır.'),
});

const signupSchema = z.object({
  name:     z.string().min(2, 'Ad en az 2 karakter olmalıdır.'),
  username: z.string().min(3).regex(/^[a-zA-Z0-9_]+$/, 'Kullanıcı adı sadece harf, rakam ve _ içerebilir.'),
  email:    z.string().email('Geçerli bir e-posta adresi girin.'),
  phone:    z.string().optional(),
  age:      z.number().int().min(18).max(100).optional(),
  address:  z.string().min(10, 'Adres en az 10 karakter olmalıdır.').optional(),
  password: z.string()
    .min(8,  'Şifre en az 8 karakter olmalıdır.')
    .regex(/[A-Z]/, 'En az bir büyük harf gereklidir.')
    .regex(/[a-z]/, 'En az bir küçük harf gereklidir.')
    .regex(/\d/,    'En az bir rakam gereklidir.'),
  subscription: z.object({
    planId:            z.string(),
    plan:              z.string(),
    maxTeams:          z.number(),
    maxMembersPerTeam: z.number(),
    usage:             z.object({ ocr: z.number(), aiAnaliz: z.number() }),
    feature_keys:      z.array(z.string()).optional(),
  }).optional(),
});

module.exports = { loginSchema, verifySchema, signupSchema };
export {};
