const requestService = require('./request.service');
const { createRequestSchema, respondSchema } = require('./request.validators');

class RequestController {
  // GET /requests?teamId=x&status=pending
  async getTeamRequests(req: any, res: any, next: any) {
    try {
      const { teamId, status } = req.query;
      if (!teamId) return res.status(400).json({ status: 'ERROR', message: 'teamId zorunludur.' });

      const data = await requestService.getTeamRequests(teamId, status);
      return res.status(200).json({ status: 'OK', data });
    } catch (error) { next(error); }
  }

  // GET /requests/:id
  async getRequestById(req: any, res: any, next: any) {
    try {
      const data = await requestService.getRequestById(req.params.id);
      if (!data) return res.status(404).json({ status: 'ERROR', message: 'Talep bulunamadı.' });
      return res.status(200).json({ status: 'OK', data });
    } catch (error) { next(error); }
  }

  // POST /requests — yeni talep (REST fallback; öncelikli yol WS'dir)
  async createRequest(req: any, res: any, next: any) {
    try {
      const parsed = createRequestSchema.safeParse(req.body);
      if (!parsed.success)
        return res.status(400).json({ status: 'ERROR', errors: parsed.error.flatten().fieldErrors });

      const userId = req.user?.userId;
      const data   = await requestService.createRequest({ ...parsed.data, senderId: userId });
      return res.status(201).json({ status: 'OK', data });
    } catch (error) { next(error); }
  }

  // PATCH /requests/:id/respond — onayla / reddet
  async respondToRequest(req: any, res: any, next: any) {
    try {
      const parsed = respondSchema.safeParse(req.body);
      if (!parsed.success)
        return res.status(400).json({ status: 'ERROR', errors: parsed.error.flatten().fieldErrors });

      const { teamId } = req.query;
      if (!teamId) return res.status(400).json({ status: 'ERROR', message: 'teamId zorunludur.' });

      const updated = await requestService.respondToRequest(
        req.params.id,
        parsed.data.action,
        teamId,
        parsed.data.rejectionReason,
      );

      // WS üzerinden takıma güncellemeyi yayınla
      try {
        const { emitToTeam } = require('../../config/websocket');
        emitToTeam(teamId, 'request:update', { action: 'responded', request: updated });
      } catch {}

      return res.status(200).json({ status: 'OK', data: updated });
    } catch (error: any) {
      res.status(400).json({ status: 'ERROR', message: error.message });
    }
  }

  // DELETE /requests/:id — talebi iptal et
  async cancelRequest(req: any, res: any, next: any) {
    try {
      const result = await requestService.cancelRequest(req.params.id, req.user?.userId);
      return res.status(200).json({ status: 'OK', ...result });
    } catch (error: any) {
      res.status(400).json({ status: 'ERROR', message: error.message });
    }
  }
}

module.exports = new RequestController();
export {};
