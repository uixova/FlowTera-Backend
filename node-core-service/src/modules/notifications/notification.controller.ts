const notificationService = require('./notification.service');
const { createInfoSchema } = require('./notification.validators');

class NotificationController {
  // GET /notifications?userId=x&teamId=y
  async getNotifications(req: any, res: any, next: any) {
    try {
      const userId = req.query.userId || req.user?.userId;
      const teamId = req.query.teamId || undefined;

      const data = await notificationService.getNotifications(userId, teamId);
      return res.status(200).json({ status: 'OK', ...data });
    } catch (error) { next(error); }
  }

  // DELETE /notifications/:id
  async deleteNotification(req: any, res: any, next: any) {
    try {
      await notificationService.deleteNotification(req.params.id, req.user?.userId);
      return res.status(200).json({ status: 'OK', message: 'Bildirim silindi.' });
    } catch (error: any) {
      res.status(400).json({ status: 'ERROR', message: error.message });
    }
  }

  // DELETE /notifications/clear-infos
  async clearInfos(req: any, res: any, next: any) {
    try {
      await notificationService.clearUserInfos(req.user?.userId);
      return res.status(200).json({ status: 'OK', message: 'Bildirimler temizlendi.' });
    } catch (error) { next(error); }
  }

  // POST /notifications (sistem içi info/invite bildirimi oluştur)
  async createInfo(req: any, res: any, next: any) {
    try {
      const parsed = createInfoSchema.safeParse(req.body);
      if (!parsed.success)
        return res.status(400).json({ status: 'ERROR', errors: parsed.error.flatten().fieldErrors });

      const notification = await notificationService.createInfoNotification(parsed.data);
      return res.status(201).json({ status: 'OK', data: notification });
    } catch (error) { next(error); }
  }
}

module.exports = new NotificationController();
export {};
