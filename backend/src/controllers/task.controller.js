
import * as service from '../services/task.service.js';

export async function list(req, res, next) {
  try { res.json({ tasks: await service.list(req.user, req.query) }); }
  catch (e) { next(e); }
}

export async function create(req, res, next) {
  try { res.status(201).json({ task: await service.create(req.user, req.body) }); }
  catch (e) { next(e); }
}

export async function update(req, res, next) {
  try { res.json({ task: await service.update(req.user, req.params.id, req.body) }); }
  catch (e) { next(e); }
}

export async function logWork(req, res, next) {
  try { res.status(201).json({ task: await service.logWork(req.user, req.params.id, req.body) }); }
  catch (e) { next(e); }
}

export async function remove(req, res, next) {
  try { res.json(await service.remove(req.user, req.params.id)); }
  catch (e) { next(e); }
}
