const archiveService = require('./archive.service');

class ArchiveController {
  async getArchiveData(req: any, res: any, next: any) {
    try {
      const { teamId } = req.query;
      if (!teamId) return res.status(400).json({ status: 'ERROR', message: 'teamId zorunludur.' });

      const page     = parseInt(req.query.page     as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;

      const result = await archiveService.getArchiveData(teamId, page, pageSize);
      return res.status(200).json({ status: 'OK', data: result });
    } catch (error) { next(error); }
  }
}

module.exports = new ArchiveController();
export {};
