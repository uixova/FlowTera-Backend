const teamService = require('./team.service');

class TeamController {
  async getMyTeams(req: any, res: any, next: any) {
    try {
      const teams = await teamService.getTeamsByUserId(req.user.userId);
      res.status(200).json({ status: 'OK', data: teams });
    } catch (error) { next(error); }
  }

  async getMembers(req: any, res: any, next: any) {
    try {
      const members = await teamService.getTeamMembers(req.params.teamId);
      res.status(200).json({ status: 'OK', data: members });
    } catch (error) { next(error); }
  }

  async getTeamSettings(req: any, res: any, next: any) {
    try {
      const settings = await teamService.getTeamSettings(req.params.teamId);
      if (!settings) return res.status(404).json({ status: 'ERROR', message: 'Takım bulunamadı.' });
      res.status(200).json({ status: 'OK', data: settings });
    } catch (error) { next(error); }
  }

  async createTeam(req: any, res: any, next: any) {
    try {
      const { name, category } = req.body;
      if (!name || !category)
        return res.status(400).json({ status: 'ERROR', message: 'Takım adı ve kategorisi zorunludur.' });

      const team = await teamService.createTeam(req.body, req.user.userId);
      res.status(201).json({ status: 'OK', data: team });
    } catch (error: any) {
      res.status(400).json({ status: 'ERROR', message: error.message });
    }
  }

  async updateTeam(req: any, res: any, next: any) {
    try {
      const team = await teamService.updateTeam(req.params.teamId, req.body);
      res.status(200).json({ status: 'OK', data: team });
    } catch (error) { next(error); }
  }

  async updateTeamSettings(req: any, res: any, next: any) {
    try {
      const team = await teamService.updateTeamSettings(req.params.teamId, req.body);
      res.status(200).json({ status: 'OK', data: team });
    } catch (error: any) {
      res.status(400).json({ status: 'ERROR', message: error.message });
    }
  }

  async deleteTeam(req: any, res: any, next: any) {
    try {
      await teamService.deleteTeam(req.params.teamId);
      res.status(200).json({ status: 'OK', message: 'Takım başarıyla silindi.' });
    } catch (error) { next(error); }
  }
}

module.exports = new TeamController();
export {};
