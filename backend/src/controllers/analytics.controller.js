import * as service from '../services/analytics.service.js';
import { listRecommendations } from '../services/recommendations.service.js';
export async function overview(req,res,next){try{res.json(await service.overview(req.user));}catch(e){next(e)}}
export async function workload(req,res,next){try{res.json({workload:await service.workload(req.user)});}catch(e){next(e)}}

export async function recommendations(req,res,next){try{res.json({recommendations:await listRecommendations(req.user)});}catch(e){next(e)}}
