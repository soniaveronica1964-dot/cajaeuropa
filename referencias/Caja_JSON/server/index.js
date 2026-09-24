import express from 'express';
import cors from 'cors';
import { getBoxes, createBox, updateBox, deleteBox, createPreviousCaja, getCurrent, getHistory, getConfig, updateConfig, createBonus, updateBonus, deleteBonus, uploadBonusImage, downloadBonusImage, uploadBoxBackground, downloadBoxBackground, deleteBoxBackground, createBonusThumbnails, updateCurrent, updateCaja, setWalletAssignment, createTransfer, updateTransfer, deleteTransfer, closeCurrent } from './store.js';

const app = express();
app.use(cors());
app.use(express.json());
const requireUpdatedAt = (req) => {
  const updatedAt = req.body?.updatedAt;
  if (!updatedAt) {
    const error = new Error('Falta updatedAt para guardar el cambio.');
    error.status = 400;
    throw error;
  }
  return updatedAt;
};
const handle = (action) => async (req, res) => {
  try { res.json(await action(req)); } catch (error) {
    if (error.code === 'ERR_CONCURRENCY_CONFLICT') return res.status(409).json({ error: 'OUTDATED_STATE', message: 'Los datos han cambiado en el servidor. Por favor sincroniza antes de guardar.' });
    res.status(error.status || 400).json({ error: error.message });
  }
};

app.get('/api/cajas', handle(() => getBoxes()));
app.post('/api/cajas', handle((req) => createBox(req.body)));
app.put('/api/cajas/:id', handle((req) => updateBox(req.params.id, req.body)));
app.delete('/api/cajas/:id', handle((req) => deleteBox(req.params.id, requireUpdatedAt(req))));
app.post('/api/caja/crear-anterior', handle((req) => createPreviousCaja(req.query.boxId, requireUpdatedAt(req))));
app.get('/api/caja/actual', handle((req) => getCurrent(req.query.boxId)));
app.get('/api/caja/historial', handle((req) => getHistory(req.query.boxId)));
app.get('/api/configuracion', handle((req) => getConfig(req.query.boxId)));
app.put('/api/configuracion', handle((req) => updateConfig(req.body, req.query.boxId, requireUpdatedAt(req))));
app.get('/api/bonos', handle((req) => getConfig(req.query.boxId).then((config) => config.bonuses)));
app.post('/api/bonos', handle((req) => createBonus(req.body, req.query.boxId)));
app.put('/api/bonos/:id', handle((req) => updateBonus(req.params.id, req.body, req.query.boxId)));
app.delete('/api/bonos/:id', handle((req) => deleteBonus(req.params.id, req.query.boxId, requireUpdatedAt(req))));
app.post('/api/bonos/:id/imagen', express.raw({ type: '*/*', limit: '20mb' }), async (req, res) => {
  try { res.json(await uploadBonusImage(req.params.id, req.body, { name: req.headers['x-file-name'], type: req.headers['content-type'], updatedAt: req.headers['x-updated-at'] }, req.query.boxId)); }
  catch (error) {
    if (error.code === 'ERR_CONCURRENCY_CONFLICT') return res.status(409).json({ error: 'OUTDATED_STATE', message: 'Los datos han cambiado en el servidor. Por favor sincroniza antes de guardar.' });
    res.status(400).json({ error: error.message });
  }
});
app.post('/api/bonos/miniaturas', handle(() => createBonusThumbnails()));
app.get('/api/bonos/:id/imagen', async (req, res) => {
  try { const image = await downloadBonusImage(req.params.id, req.query.boxId, req.query.mini === '1'); res.set('Content-Type', image.type); res.set('Content-Disposition', `${req.query.download === '1' ? 'attachment' : 'inline'}; filename="${encodeURIComponent(image.name)}"`); res.send(Buffer.from(await image.data.arrayBuffer())); }
  catch (error) { res.status(404).json({ error: error.message }); }
});
app.post('/api/cajas/:id/imagen-fondo', express.raw({ type: '*/*', limit: '20mb' }), async (req, res) => {
  try { res.json(await uploadBoxBackground(req.body, { type: req.headers['content-type'], updatedAt: req.headers['x-updated-at'] }, req.params.id)); }
  catch (error) {
    if (error.code === 'ERR_CONCURRENCY_CONFLICT') return res.status(409).json({ error: 'OUTDATED_STATE', message: 'Los datos han cambiado en el servidor. Por favor sincroniza antes de guardar.' });
    res.status(400).json({ error: error.message });
  }
});
app.delete('/api/cajas/:id/imagen-fondo', handle((req) => deleteBoxBackground(req.params.id, requireUpdatedAt(req))));
app.get('/api/cajas/:id/imagen-fondo', async (req, res) => {
  try { const image = await downloadBoxBackground(req.params.id); res.set('Content-Type', image.type); res.set('Content-Disposition', `inline; filename="${image.name}"`); res.send(Buffer.from(await image.data.arrayBuffer())); }
  catch (error) { res.status(404).json({ error: error.message }); }
});
app.put('/api/caja/actualizar', handle((req) => updateCurrent(req.body, req.query.boxId, requireUpdatedAt(req))));
app.put('/api/caja/asignacion-billetera', handle((req) => setWalletAssignment({ ...req.body, updatedAt: requireUpdatedAt(req) })));
app.put('/api/caja/:id', handle((req) => updateCaja(req.params.id, req.body, req.query.boxId, requireUpdatedAt(req))));
app.post('/api/traspasos', handle((req) => createTransfer({ ...req.body, updatedAt: requireUpdatedAt(req) })));
app.put('/api/traspasos/:id', handle((req) => updateTransfer(req.params.id, { ...req.body, updatedAt: requireUpdatedAt(req) })));
app.delete('/api/traspasos/:id', handle((req) => deleteTransfer(req.params.id, requireUpdatedAt(req))));
app.post('/api/caja/cerrar', handle((req) => closeCurrent(req.body, req.query.boxId, requireUpdatedAt(req))));

const port = Number(process.env.PORT) || 3001;
app.get('/api/health', async (req, res) => {
  const environment = { supabaseUrl: Boolean(process.env.SUPABASE_URL?.trim()), serviceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) };
  try { await getBoxes(); res.json({ ok: true, storage: 'supabase', apiVersion: '2026-08-26-reset', environment }); }
  catch (error) { res.status(503).json({ ok: false, storage: 'supabase', apiVersion: '2026-08-26-reset', environment, error: error.message }); }
});
app.use('/api', (req, res) => res.status(404).json({ error: `Ruta de API no encontrada: ${req.method} ${req.path}. Verificá que el backend esté actualizado.` }));
app.listen(port, '0.0.0.0', () => console.log(`API de caja lista en http://localhost:${port} (supabase)`));
