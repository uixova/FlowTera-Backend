const tripService = require('./trip.service');

class TripController {
  async getTripsByTeam(req: any, res: any, next: any) {
    try {
      const { teamId } = req.query;
      if (!teamId) return res.status(400).json({ status: 'ERROR', message: 'teamId zorunludur.' });

      const page     = parseInt(req.query.page     as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const result   = await tripService.getTripsByTeam(teamId, page, pageSize);
      return res.status(200).json({ status: 'OK', ...result });
    } catch (error) { next(error); }
  }

  async getTripById(req: any, res: any, next: any) {
    try {
      const trip = await tripService.getTripById(req.params.id);
      if (!trip) return res.status(404).json({ status: 'ERROR', message: 'Seyahat kaydı bulunamadı.' });
      return res.status(200).json({ status: 'OK', data: trip });
    } catch (error) { next(error); }
  }

  async createTrip(req: any, res: any, next: any) {
    try {
      const { title, category, destination, vehicle, date, amount, currency, currencySymbol, teamId } = req.body;
      if (!title || !category || !destination || !vehicle || !date || !amount || !currency || !currencySymbol || !teamId)
        return res.status(400).json({ status: 'ERROR', message: 'Zorunlu alanlar eksik.' });

      const createdById = req.user?.userId || req.body.userId;
      if (!createdById) return res.status(400).json({ status: 'ERROR', message: 'Kullanıcı kimliği bulunamadı.' });

      const trip = await tripService.createTrip(req.body, createdById);
      return res.status(201).json({ status: 'OK', data: trip });
    } catch (error) { next(error); }
  }

  async updateTrip(req: any, res: any, next: any) {
    try {
      const trip = await tripService.updateTrip(req.params.id, req.body);
      return res.status(200).json({ status: 'OK', data: trip });
    } catch (error) { next(error); }
  }

  async updateTripStatus(req: any, res: any, next: any) {
    try {
      const { status, rejectionReason } = req.body;
      if (!status) return res.status(400).json({ status: 'ERROR', message: 'status zorunludur.' });

      const adminName = req.user?.email || 'Admin';
      const teamId    = req.teamMember?.teamId;
      const trip      = await tripService.updateTripStatus(req.params.id, status, adminName, rejectionReason, teamId);
      return res.status(200).json({ status: 'OK', data: trip });
    } catch (error) { next(error); }
  }

  async deleteTrip(req: any, res: any, next: any) {
    try {
      const result = await tripService.deleteTrip(req.params.id);
      return res.status(200).json({ status: 'OK', ...result });
    } catch (error) { next(error); }
  }
}

module.exports = new TripController();
export {};
