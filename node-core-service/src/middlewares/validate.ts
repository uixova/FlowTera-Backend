const { ZodSchema } = require('zod');

// Zod Şema Doğrulama Middleware Factory 
// Kullanım: router.post('/create', validate(createSchema), controller.create)
//
// body   : varsayılan hedef — req.body doğrular
// params : req.params doğrular
// query  : req.query doğrular
//
// Başarılı olursa req[target] ayrıştırılmış (parse edilmiş) değerle güncellenir.

type ValidateTarget = 'body' | 'params' | 'query';

const validate = (schema: typeof ZodSchema, target: ValidateTarget = 'body') =>
  (req: any, res: any, next: any): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const errors = result.error.issues.map((i: any) => ({
        alan:  i.path?.join('.') || 'bilinmiyor',
        hata:  i.message,
        değer: i.received,
      }));

      res.status(400).json({
        status:  'VALIDATION_ERROR',
        message: 'Girdi doğrulama başarısız.',
        errors,
      });
      return;
    }

    // req.body (veya params/query) doğrulanmış veriyle güncellenir
    req[target] = result.data;
    next();
  };

module.exports = { validate };
export {};
