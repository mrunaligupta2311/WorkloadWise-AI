import { list as listTeam } from '../services/team.service.js';
export async function list(req,res,next){try{res.json({team:await listTeam(req.user)});}catch(e){next(e)}}
