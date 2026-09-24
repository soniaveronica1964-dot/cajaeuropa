import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
const requireSupabase = () => {
  if (!supabase) throw new Error(`La API está bloqueada: faltan ${!supabaseUrl ? 'SUPABASE_URL' : ''}${!supabaseUrl && !supabaseKey ? ' y ' : ''}${!supabaseKey ? 'SUPABASE_SERVICE_ROLE_KEY' : ''} en el entorno del backend`);
  return supabase;
};
const titulares = ['Fede Acuña', 'Pablo Totaro', 'Mateo Ferrer', 'Ever Lombardo'];
const billeteras = ['Ualá', 'Mercado Pago', 'Personal Pay', 'Naranja X', 'Brubank', 'Prex', 'Astro Pay', 'Belo', 'Lemon'];
const plataformas = ['Ganamos', 'Zeus', 'Apostamos'];
const colors = ['teal', 'blue', 'green', 'orange', 'pink', 'red', 'yellow', 'violet', 'slate'];
const walletCategories = ['Normal', 'Depósitos', 'Compartidas', 'Ahorro'];
let bonusOperationQueue = Promise.resolve();
let spacesReadPromise = null;
const withBonusOperationLock = (operation) => {
  const queued = bonusOperationQueue.catch(() => undefined).then(async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try { return await operation(); }
      catch (error) {
        if (!error.message?.includes('BDD cambió desde la última lectura') || attempt === 2) throw error;
      }
    }
  });
  bonusOperationQueue = queued.catch(() => undefined);
  return queued;
};
const nextShift = { Noche: 'Mañana', Mañana: 'Tarde', Tarde: 'Noche' };
const previousShiftFor = { Noche: 'Tarde', Mañana: 'Noche', Tarde: 'Mañana' };
const shiftOrder = ['Noche', 'Mañana', 'Tarde'];

function shiftDateFor(dateValue, shift, direction = 1) {
  const base = new Date(dateValue ?? Date.now());
  const day = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const offset = direction > 0 ? (shift === 'Tarde' ? 1 : 0) : (shift === 'Noche' ? -1 : 0);
  day.setDate(day.getDate() + offset);
  return day.toISOString();
}

const blankAdvertising = () => ({ 'Publicidad A': { total: 0, new: 0, repeated: 0, derived: {} }, 'Publicidad B': { total: 0, new: 0, repeated: 0, derived: {} } });
function normalizeAdvertising(advertising) {
  const defaults = blankAdvertising();
  return Object.fromEntries(Object.keys(defaults).map((name) => {
    const item = advertising?.[name] || {};
    return [name, {
      total: Number(item.total) || 0,
      new: Number(item.new) || 0,
      repeated: Number(item.repeated) || 0,
      derived: { ...(item.derived || {}) },
    }];
  }));
}
function normalizeSpaces(spaces) {
  let changed = false;
  spaces.forEach((space) => space.cajas.forEach((caja) => {
    const advertising = normalizeAdvertising(caja.advertising);
    if (JSON.stringify(advertising) !== JSON.stringify(caja.advertising)) {
      caja.advertising = advertising;
      changed = true;
    }
  }));
  return changed;
}
const defaultConfig = () => ({
  branding: { icon: 'banknote', suffix: 'flow' },
  accounts: { holders: titulares, wallets: billeteras, availability: Object.fromEntries(titulares.map((holder) => [holder, Object.fromEntries(billeteras.map((wallet) => [wallet, true]))])), walletSettings: Object.fromEntries(titulares.map((holder) => [holder, Object.fromEntries(billeteras.map((wallet) => [wallet, { category: 'Normal', boxId: null }]))])), walletModes: Object.fromEntries(billeteras.map((wallet) => [wallet, 'Cobros + Retiros'])) },
  logistics: { order: [], hidden: [], added: [] },
  statistics: { employees: 1, proportionalPercent: 100 },
  monthlyGoal: { final: 0, achieved: 0, platformDeposits: {}, months: {} },
  bonusGoal: { total: 0, percentages: { Noche: 33, Mañana: 33, Tarde: 34 } },
  savingsGoal: { total: 0, shifts: { Noche: 0, Mañana: 0, Tarde: 0 } },
  expenses: [{ name: 'Caja chica', inverted: false }, { name: 'Servicios', inverted: false }, { name: 'Traslado', inverted: false }],
  platforms: plataformas,
  platformColors: Object.fromEntries(plataformas.map((platform, index) => [platform, colors[index % colors.length]])),
  platformEnabled: Object.fromEntries(plataformas.map((platform) => [platform, true])),
  platformSubPlatforms: Object.fromEntries(plataformas.map((platform) => [platform, []])),
  users: [],
  userClarifications: [],
  userInfoOptions: [],
  bonusTypes: [],
  bonusConditions: [],
  bonuses: [],
});
const blankCaja = (id, previous = null, config = defaultConfig()) => {
  const shift = previous ? nextShift[previous.shift] || shiftOrder[0] : shiftOrder[id % shiftOrder.length] || shiftOrder[0];
  const date = previous ? shiftDateFor(previous.date, previous.shift, 1) : new Date().toISOString();
  return {
    id,
    status: 'ABIERTA',
    shift,
    date,
    cashInitial: previous?.cashFinal ?? 0,
    nextNotes: previous?.nextNotes ?? '',
    notes: '',
    accountSections: structuredClone(previous?.accountSections || { deposits: false, shared: false }),
    accounts: config.accounts.holders.map((holder) => {
      const previousAccount = previous?.accounts?.find((account) => account.holder === holder);
      return {
        holder,
        holderId: config.accounts.holderEntities?.find((entity) => entity.name === holder)?.id,
        values: Object.fromEntries(config.accounts.wallets.map((wallet) => [wallet, previousAccount?.values?.[wallet] ?? 0])),
        walletIds: Object.fromEntries(config.accounts.wallets.map((wallet) => [wallet, config.accounts.walletEntities?.find((entity) => entity.name === wallet)?.id])),
        walletBoxes: { ...(previousAccount?.walletBoxes ?? {}) },
        walletBoxUpdatedAt: { ...(previousAccount?.walletBoxUpdatedAt ?? {}) },
        walletRestartAt: { ...(previousAccount?.walletRestartAt ?? {}) },
        verified: structuredClone(previousAccount?.verified ?? {}),
        notes: { ...(previousAccount?.notes ?? {}) },
      };
    }),
    bonuses: [],
    ta: [],
    tips: [],
    expenses: [],
    transfers: [],
    found: 0,
    foundMoney: [],
    advertising: previous?.shift === 'Tarde' ? blankAdvertising() : structuredClone(previous?.advertising || blankAdvertising()),
    chips: config.platforms.filter((platform) => config.platformEnabled?.[platform] !== false).map((platform) => {
      const previousChip = previous?.chips?.find((item) => item.platform === platform);
      const value = previousChip?.final ?? 0;
      return {
        platform,
        platformId: config.platformEntities?.find((entity) => entity.name === platform)?.id,
        initial: value,
        final: value,
      };
    }),
    chipLoads: [],
  };
};
async function writeSpaces(spaces, clientUpdatedAt = null, { allowSpaceDeletion = false } = {}) {
  const database = requireSupabase();
  if (!Array.isArray(spaces) || spaces.length === 0 || spaces.some((space) => !space?.id || !space?.config || !Array.isArray(space.cajas) || space.cajas.length === 0)) {
    throw new Error('No se guardó el cambio: la BDD debe conservar al menos una caja, su configuración y un registro diario.');
  }
  if (!spaces.updatedAt && !clientUpdatedAt) throw new Error('No se pudo guardar: falta la versión de la BDD');
  const { data: currentState, error: readError } = await database.from('app_state').select('spaces, updated_at').eq('id', 'main').maybeSingle();
  if (readError) throw new Error(`No se pudo verificar la BDD antes de guardar: ${readError.message}`);
  if (!currentState?.spaces) throw new Error('No se guardó el cambio: la BDD no contiene un estado válido.');
  const currentIds = new Set(currentState.spaces.map((space) => space.id));
  const nextIds = new Set(spaces.map((space) => space.id));
  if (!allowSpaceDeletion && [...currentIds].some((id) => !nextIds.has(id))) {
    throw new Error('No se guardó el cambio: detectamos que desaparecería una caja. Recargá la página e intentá nuevamente.');
  }
  if (!allowSpaceDeletion) {
    currentState.spaces.forEach((currentSpace) => {
      const nextSpace = spaces.find((space) => space.id === currentSpace.id);
      const nextCajaIds = new Set((nextSpace?.cajas || []).map((caja) => String(caja.id)));
      if (currentSpace.cajas.some((caja) => !nextCajaIds.has(String(caja.id)))) {
        throw new Error('No se guardó el cambio: detectamos que desaparecería un registro diario. Recargá la página e intentá nuevamente.');
      }
    });
  }
  const expectedUpdatedAt = clientUpdatedAt ?? spaces.updatedAt;
  if (expectedUpdatedAt && currentState.updated_at !== expectedUpdatedAt) {
    const error = new Error('ERR_CONCURRENCY_CONFLICT');
    error.code = 'ERR_CONCURRENCY_CONFLICT';
    throw error;
  }
  const updatedAt = new Date().toISOString();
  const comparableSpace = (space) => {
    const copy = structuredClone(space);
    delete copy.lastSavedAt;
    return JSON.stringify(copy);
  };
  spaces.forEach((space) => {
    const previousSpace = currentState.spaces.find((item) => item.id === space.id);
    if (!previousSpace || comparableSpace(previousSpace) !== comparableSpace(space)) space.lastSavedAt = updatedAt;
  });
  const { data, error } = await database.from('app_state').update({ spaces, updated_at: updatedAt }).eq('id', 'main').eq('updated_at', expectedUpdatedAt).select('id').maybeSingle();
  if (error) throw new Error(`No se pudo guardar en Supabase: ${error.message}`);
  if (!data) {
    const conflictError = new Error('ERR_CONCURRENCY_CONFLICT');
    conflictError.code = 'ERR_CONCURRENCY_CONFLICT';
    throw conflictError;
  }
  spaces.updatedAt = updatedAt;
  spacesReadPromise = null;
  return updatedAt;
}
async function readSpacesFromDatabase() {
  const database = requireSupabase();
  const { data, error } = await database.from('app_state').select('spaces, updated_at').eq('id', 'main').maybeSingle();
  if (error) throw new Error(`No se pudo leer Supabase: ${error.message}`);
  if (data?.spaces) {
    const spaces = data.spaces;
    spaces.updatedAt = data.updated_at;
    return spaces;
  }
  throw new Error('La BDD no contiene el estado de la aplicación. No se crearán datos iniciales automáticamente.');
}
async function readSpaces() {
  if (!spacesReadPromise) {
    const readPromise = readSpacesFromDatabase();
    spacesReadPromise = readPromise;
    readPromise.then(
      () => { if (spacesReadPromise === readPromise) spacesReadPromise = null; },
      () => { if (spacesReadPromise === readPromise) spacesReadPromise = null; },
    );
  }
  return spacesReadPromise;
}
async function getSpace(boxId) { const spaces = await readSpaces(); return spaces.find((space) => space.id === boxId) || spaces[0]; }
function normalizeConfig(config) {
  const defaults = defaultConfig(); const accounts = config?.accounts || {};
  const branding = { icon: ['banknote', 'wallet', 'coins', 'gift', 'ticket', 'receipt'].includes(config?.branding?.icon) ? config.branding.icon : defaults.branding.icon, suffix: String(config?.branding?.suffix ?? defaults.branding.suffix).trim().slice(0, 18) || defaults.branding.suffix, backgroundImagePath: String(config?.branding?.backgroundImagePath || '') };
  const holders = Array.isArray(accounts.holders) && accounts.holders.length ? accounts.holders : defaults.accounts.holders;
  const wallets = Array.isArray(accounts.wallets) && accounts.wallets.length ? accounts.wallets : defaults.accounts.wallets;
  const sourceAvailability = accounts.availability || {};
  const availability = Object.fromEntries(holders.map((holder) => [holder, Object.fromEntries(wallets.map((wallet) => [wallet, sourceAvailability[holder]?.[wallet] !== false]))]));
  const sourceWalletSettings = accounts.walletSettings || {};
  const walletSettings = Object.fromEntries(holders.map((holder) => [holder, Object.fromEntries(wallets.map((wallet) => { const legacySetting = sourceWalletSettings[wallet]; const setting = sourceWalletSettings[holder]?.[wallet] || (legacySetting && !legacySetting.category ? legacySetting : {}); return [wallet, { category: walletCategories.includes(setting.category) ? setting.category : 'Normal', boxId: setting.boxId || null, alias: String(setting.alias || ''), cuil: String(setting.cuil || ''), password: String(setting.password || ''), note: String(setting.note || '') }]; }))]));
  const sourceWalletModes = accounts.walletModes || {};
  const walletModes = Object.fromEntries(wallets.map((wallet) => [wallet, ['Cobros + Retiros', 'Solo Cobros', 'Solo Depósito'].includes(sourceWalletModes[wallet]) ? sourceWalletModes[wallet] : 'Cobros + Retiros']));
  const sourceLogistics = config?.logistics || {};
  const logistics = { order: Array.isArray(sourceLogistics.order) ? sourceLogistics.order : [], hidden: Array.isArray(sourceLogistics.hidden) ? sourceLogistics.hidden : [], added: Array.isArray(sourceLogistics.added) ? sourceLogistics.added : [] };
  const sourceStatistics = config?.statistics || {};
  const statistics = { employees: Math.max(1, Number(sourceStatistics.employees) || 1), proportionalPercent: sourceStatistics.proportionalPercent === undefined ? 100 : Math.min(100, Math.max(0, Number(sourceStatistics.proportionalPercent) || 0)) };
  const sourceMonthlyGoal = config?.monthlyGoal || {};
  const normalizeMonthlyGoalEntry = (entry = {}) => ({
    final: Math.max(0, Number(entry.final) || 0),
    achieved: Math.max(0, Number(entry.achieved) || 0),
    platformDeposits: entry.platformDeposits && typeof entry.platformDeposits === 'object' ? entry.platformDeposits : {},
  });
  const monthlyGoal = { ...normalizeMonthlyGoalEntry(sourceMonthlyGoal), months: Object.fromEntries(Object.entries(sourceMonthlyGoal.months || {}).map(([month, entry]) => [month, normalizeMonthlyGoalEntry(entry)])) };
  const sourceBonusGoal = config?.bonusGoal || {};
  const bonusGoal = {
    total: Math.max(0, Number(sourceBonusGoal.total) || 0),
    percentages: {
      Noche: Math.min(100, Math.max(0, Number(sourceBonusGoal.percentages?.Noche) || 33)),
      Mañana: Math.min(100, Math.max(0, Number(sourceBonusGoal.percentages?.Mañana) || 33)),
      Tarde: Math.min(100, Math.max(0, Number(sourceBonusGoal.percentages?.Tarde) || 34)),
    },
  };
  const sourceSavingsGoal = config?.savingsGoal || {};
  const savingsGoal = {
    total: Math.max(0, Number(sourceSavingsGoal.total) || 0),
    shifts: {
      Noche: Math.max(0, Number(sourceSavingsGoal.shifts?.Noche) || 0),
      Mañana: Math.max(0, Number(sourceSavingsGoal.shifts?.Mañana) || 0),
      Tarde: Math.max(0, Number(sourceSavingsGoal.shifts?.Tarde) || 0),
    },
  };
  const platforms = Array.isArray(config?.platforms) && config.platforms.length ? config.platforms : defaults.platforms;
  const platformColors = Object.fromEntries(platforms.map((platform, index) => [platform, colors.includes(config?.platformColors?.[platform]) ? config.platformColors[platform] : defaults.platformColors[platform] || colors[index % colors.length]]));
  const sourcePlatformEnabled = config?.platformEnabled || {};
  const platformEnabled = Object.fromEntries(platforms.map((platform) => [platform, sourcePlatformEnabled[platform] !== false]));
  const sourceSubPlatforms = config?.platformSubPlatforms || {};
  const platformSubPlatforms = Object.fromEntries(platforms.map((platform) => [platform, (Array.isArray(sourceSubPlatforms[platform]) ? sourceSubPlatforms[platform] : []).map((item) => {
    if (typeof item === 'string') return { name: String(item || '').trim(), color: 'teal' };
    return { name: String(item?.name || '').trim(), color: colors.includes(item?.color) ? item.color : 'teal' };
  })]));
  const userClarifications = Array.isArray(config?.userClarifications) ? config.userClarifications.map((clarification) => ({
    id: clarification?.id || `clarification-${crypto.randomUUID()}`,
    text: String(clarification?.text || ''),
    color: colors.includes(clarification?.color) ? clarification.color : 'teal',
    emoji: String(clarification?.emoji || ''),
  })) : [];
  const userInfoOptions = Array.isArray(config?.userInfoOptions) ? config.userInfoOptions.map((option) => String(option || '').trim()).filter(Boolean) : [];
  const bonusTypes = Array.isArray(config?.bonusTypes) ? config.bonusTypes.map((type) => ({ id: String(type?.id || `bonus-type-${crypto.randomUUID()}`), name: String(type?.name || '').trim(), percentageCount: Math.max(1, Math.min(20, Number(type?.percentageCount) || 1)) })).filter((type) => type.name) : [];
  const bonusConditions = Array.isArray(config?.bonusConditions) ? config.bonusConditions.map((condition) => ({ id: String(condition?.id || `bonus-condition-${crypto.randomUUID()}`), label: String(condition?.label || '').trim(), allowPlatform: condition?.allowPlatform === true })).filter((condition) => condition.label) : [];
  const bonuses = Array.isArray(config?.bonuses) ? config.bonuses.map((bonus) => ({
    id: String(bonus?.id || `bonus-${crypto.randomUUID()}`),
    name: String(bonus?.name || '').trim(),
    typeId: String(bonus?.typeId || ''),
    conditions: Array.isArray(bonus?.conditions) ? bonus.conditions.map((item) => ({ conditionId: String(item?.conditionId || ''), percentage: Number(item?.percentage) || 0, platform: String(item?.platform || '') })) : [],
    imagePath: String(bonus?.imagePath || ''),
    imageName: String(bonus?.imageName || ''),
    imageType: String(bonus?.imageType || ''),
    createdAt: String(bonus?.createdAt || new Date().toISOString()),
    updatedAt: String(bonus?.updatedAt || bonus?.createdAt || new Date().toISOString()),
  })) : [];
  const users = Array.isArray(config?.users) ? config.users.map((user) => ({
    id: user?.id || `user-${crypto.randomUUID()}`,
    names: Array.isArray(user?.names) ? user.names.filter(Boolean).map(String) : [user?.name || ''].filter(Boolean).map(String),
    phones: Array.isArray(user?.phones) ? user.phones.filter(Boolean).map(String) : [user?.phone || ''].filter(Boolean).map(String),
    boxes: Array.isArray(user?.boxes) ? user.boxes.filter(Boolean).map(String) : [],
    subPlatforms: Array.isArray(user?.subPlatforms) ? user.subPlatforms.filter(Boolean).map(String) : [],
    userInfo: user?.userInfo && typeof user.userInfo === 'object' ? { boxId: String(user.userInfo.boxId || ''), value: String(user.userInfo.value || '') } : null,
    titulars: Array.isArray(user?.titulars) ? user.titulars.filter(Boolean).map(String) : [user?.titular || ''].filter(Boolean).map(String),
    titular: String(user?.titular || ''),
    createdAt: String(user?.createdAt || new Date().toISOString()),
    clarifications: Array.isArray(user?.clarifications) ? user.clarifications.filter(Boolean).map(String) : [],
    linkedUsers: Array.isArray(user?.linkedUsers) ? user.linkedUsers.filter(Boolean).map(String) : [],
  })) : [];
  const entitiesFor = (names, source = [], prefix) => names.map((name, index) => ({ id: source.find((entity) => entity.name === name)?.id || source[index]?.id || `${prefix}-${index}`, name }));
  return { ...defaults, ...config, branding, logistics, statistics, monthlyGoal, bonusGoal, savingsGoal, platformColors, platformEnabled, platformSubPlatforms, userClarifications, userInfoOptions, users, bonusTypes, bonusConditions, bonuses, platforms, platformEntities: entitiesFor(platforms, config?.platformEntities, 'platform'), expenses: Array.isArray(config?.expenses) && config.expenses.length ? config.expenses : defaults.expenses, accounts: { holders, wallets, availability, walletSettings, walletModes, holderEntities: entitiesFor(holders, accounts.holderEntities, 'holder'), walletEntities: entitiesFor(wallets, accounts.walletEntities, 'wallet') } };
}
function globalMonthlyGoalFor(spaces) {
  const source = spaces.map((space) => normalizeConfig(space.config).monthlyGoal).find((goal) => goal.final > 0 || goal.achieved > 0 || Object.keys(goal.months || {}).length > 0 || Object.keys(goal.platformDeposits || {}).length > 0);
  const goal = source || { final: 0, achieved: 0, platformDeposits: {}, months: {} };
  if (Object.keys(goal.months || {}).length > 0) return goal;
  const latestCaja = spaces.flatMap((space) => space.cajas || []).sort((left, right) => new Date(left.date) - new Date(right.date)).at(-1);
  const date = new Date(latestCaja?.date);
  if (Number.isNaN(date.getTime())) return goal;
  const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  return { ...goal, months: { [month]: { final: goal.final, achieved: goal.achieved, platformDeposits: goal.platformDeposits || {} } } };
}
function globalSavingsGoalFor(spaces) {
  const source = spaces.map((space) => normalizeConfig(space.config).savingsGoal).find((goal) => goal.total > 0 || Object.values(goal.shifts || {}).some((value) => value > 0));
  return source || { total: 0, shifts: { Noche: 0, Mañana: 0, Tarde: 0 } };
}
export async function getBoxes() { return (await readSpaces()).map(({ id, title, color }) => ({ id, title, color })); }
export async function createBox({ title = 'Nueva caja', color = 'blue', updatedAt: clientUpdatedAt } = {}) { const spaces = await readSpaces(); const config = normalizeConfig({ ...defaultConfig(), monthlyGoal: globalMonthlyGoalFor(spaces), savingsGoal: globalSavingsGoalFor(spaces) }); const id = `caja-${crypto.randomUUID()}`; const space = { id, title, color: colors.includes(color) ? color : 'blue', config, cajas: [blankCaja(0, null, config)] }; spaces.push(space); const updatedAt = await writeSpaces(spaces, clientUpdatedAt ?? spaces.updatedAt); return { id, title, color: space.color, updatedAt }; }
export async function updateBox(id, patch) { const spaces = await readSpaces(); const space = spaces.find((item) => item.id === id); if (!space) throw new Error('Caja no encontrada'); if (patch.title !== undefined) space.title = String(patch.title).trim() || space.title; if (patch.color !== undefined && colors.includes(patch.color)) space.color = patch.color; const updatedAt = await writeSpaces(spaces, patch.updatedAt ?? spaces.updatedAt); return { id: space.id, title: space.title, color: space.color, updatedAt }; }
export async function deleteBox(id, clientUpdatedAt = null) { const spaces = await readSpaces(); if (spaces.length <= 1) throw new Error('Debe existir al menos una caja'); const next = spaces.filter((space) => space.id !== id); if (next.length === spaces.length) throw new Error('Caja no encontrada'); const updatedAt = await writeSpaces(next, clientUpdatedAt ?? spaces.updatedAt, { allowSpaceDeletion: true }); return { boxes: next.map(({ id: spaceId, title, color }) => ({ id: spaceId, title, color })), updatedAt }; }
export async function createPreviousCaja(boxId, clientUpdatedAt = null) { const spaces = await readSpaces(); const space = spaces.find((item) => item.id === boxId) || spaces[0]; space.config = normalizeConfig(space.config); const oldest = space.cajas[0]; if (!oldest) throw new Error('No existe un turno base para crear el anterior'); const previousShift = previousShiftFor[oldest.shift] || 'Tarde'; const previousDate = shiftDateFor(oldest.date, oldest.shift, -1); const previousId = typeof oldest.id === 'number' ? oldest.id - 1 : `${oldest.id}-anterior`; const caja = blankCaja(previousId, null, space.config); caja.shift = previousShift; caja.date = previousDate; caja.accounts = caja.accounts.map((account) => { const source = oldest.accounts.find((item) => item.holder === account.holder || item.holderId === account.holderId); return { ...account, walletBoxes: { ...(source?.walletBoxes || {}) } }; }); space.cajas.unshift(caja); const updatedAt = await writeSpaces(spaces, clientUpdatedAt ?? spaces.updatedAt); return { ...caja, updatedAt }; }
export async function getCurrent(boxId) { const spaces = await readSpaces(); const space = spaces.find((item) => item.id === boxId) || spaces[0]; return { ...space.cajas.at(-1), updatedAt: spaces.updatedAt, lastSavedAt: space.lastSavedAt || null }; }
export async function getHistory(boxId) { return (await getSpace(boxId)).cajas.slice().reverse(); }
export async function getConfig(boxId) { const spaces = await readSpaces(); const space = spaces.find((item) => item.id === boxId) || spaces[0]; return { ...normalizeConfig(space.config), monthlyGoal: globalMonthlyGoalFor(spaces), savingsGoal: globalSavingsGoalFor(spaces), updatedAt: spaces.updatedAt, lastSavedAt: space.lastSavedAt || null }; }
async function createBonusUnsafe(payload = {}, boxId) {
  const spaces = await readSpaces(); const space = spaces.find((item) => item.id === boxId) || spaces[0]; const config = normalizeConfig(space.config);
  const bonus = { id: `bonus-${crypto.randomUUID()}`, name: String(payload.name || '').trim(), typeId: String(payload.typeId || ''), conditions: Array.isArray(payload.conditions) ? payload.conditions : [], imagePath: '', imageName: '', imageType: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  if (!bonus.name || !config.bonusTypes.some((type) => type.id === bonus.typeId)) throw new Error('Completá el nombre y el tipo de bono');
  bonus.conditions = bonus.conditions.map((item) => { const condition = config.bonusConditions.find((candidate) => candidate.id === String(item?.conditionId || '')); const platform = String(item?.platform || ''); return { conditionId: String(item?.conditionId || ''), percentage: Number(item?.percentage) || 0, platform: condition?.allowPlatform && config.platforms.includes(platform) ? platform : '' }; }).filter((item) => !item.conditionId || config.bonusConditions.some((condition) => condition.id === item.conditionId));
  space.config = { ...config, bonuses: [...config.bonuses, bonus] }; const updatedAt = await writeSpaces(spaces, payload.updatedAt ?? spaces.updatedAt); return { bonus, updatedAt };
}
export const createBonus = (payload, boxId) => withBonusOperationLock(() => createBonusUnsafe(payload, boxId));
async function updateBonusUnsafe(id, payload = {}, boxId) {
  const spaces = await readSpaces(); const space = spaces.find((item) => item.id === boxId) || spaces[0]; const config = normalizeConfig(space.config); const index = config.bonuses.findIndex((bonus) => bonus.id === id);
  if (index < 0) throw new Error('Bono no encontrado');
  const current = config.bonuses[index]; const next = { ...current, name: String(payload.name ?? current.name).trim(), typeId: String(payload.typeId ?? current.typeId), conditions: Array.isArray(payload.conditions) ? payload.conditions.map((item) => { const condition = config.bonusConditions.find((candidate) => candidate.id === String(item?.conditionId || '')); const platform = String(item?.platform || ''); return { conditionId: String(item?.conditionId || ''), percentage: Number(item?.percentage) || 0, platform: condition?.allowPlatform && config.platforms.includes(platform) ? platform : '' }; }) : current.conditions, updatedAt: new Date().toISOString() };
  if (!next.name || !config.bonusTypes.some((type) => type.id === next.typeId)) throw new Error('Completá el nombre y el tipo de bono');
  next.conditions = next.conditions.filter((item) => !item.conditionId || config.bonusConditions.some((condition) => condition.id === item.conditionId)); config.bonuses[index] = next; space.config = { ...config, bonuses: config.bonuses }; const updatedAt = await writeSpaces(spaces, payload.updatedAt ?? spaces.updatedAt); return { bonus: next, updatedAt };
}
export const updateBonus = (id, payload, boxId) => withBonusOperationLock(() => updateBonusUnsafe(id, payload, boxId));
async function deleteBonusUnsafe(id, boxId, clientUpdatedAt = null) {
  const spaces = await readSpaces(); const space = spaces.find((item) => item.id === boxId) || spaces[0]; const config = normalizeConfig(space.config); const bonus = config.bonuses.find((item) => item.id === id);
  if (!bonus) throw new Error('Bono no encontrado');
  if (bonus.imagePath) { const { error } = await requireSupabase().storage.from('bonos').remove([bonus.imagePath]); if (error) throw new Error(`No se pudo eliminar la imagen: ${error.message}`); }
  space.config = { ...config, bonuses: config.bonuses.filter((item) => item.id !== id) }; const updatedAt = await writeSpaces(spaces, clientUpdatedAt ?? spaces.updatedAt); return { ok: true, updatedAt };
}
export const deleteBonus = (id, boxId, clientUpdatedAt = null) => withBonusOperationLock(() => deleteBonusUnsafe(id, boxId, clientUpdatedAt));
async function uploadBonusImageUnsafe(id, buffer, metadata, boxId) {
  const spaces = await readSpaces(); const space = spaces.find((item) => item.id === boxId) || spaces[0]; const config = normalizeConfig(space.config); const index = config.bonuses.findIndex((bonus) => bonus.id === id);
  if (index < 0) throw new Error('Bono no encontrado'); if (!buffer?.length) throw new Error('No se recibió ninguna imagen');
  const extension = String(metadata?.name || '').split('.').pop()?.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'bin'; const path = `${space.id}/${id}.${extension}`; const storage = requireSupabase().storage.from('bonos');
  const { error } = await storage.upload(path, buffer, { contentType: metadata?.type || 'application/octet-stream', upsert: true }); if (error) throw new Error(`No se pudo subir la imagen: ${error.message}`);
  try {
    const thumbnail = await sharp(buffer).resize({ width: 180, height: 320, fit: 'inside', withoutEnlargement: true }).png({ compressionLevel: 9, palette: true }).toBuffer();
    await storage.upload(`mini-${space.id}/${id}.${extension}`, thumbnail, { contentType: 'image/png', upsert: true });
  } catch (thumbnailError) {
    console.error(`No se pudo generar la miniatura de ${id}: ${thumbnailError.message}`);
  }
  const imageName = String(metadata?.name || `${id}.${extension}`); config.bonuses[index] = { ...config.bonuses[index], imagePath: path, imageName: (() => { try { return decodeURIComponent(imageName); } catch { return imageName; } })(), imageType: String(metadata?.type || ''), updatedAt: new Date().toISOString() }; space.config = { ...config, bonuses: config.bonuses }; const updatedAt = await writeSpaces(spaces, spaces.updatedAt); return { bonus: config.bonuses[index], updatedAt };
}
export const uploadBonusImage = (id, buffer, metadata, boxId) => withBonusOperationLock(() => uploadBonusImageUnsafe(id, buffer, metadata, boxId));
async function uploadBoxBackgroundUnsafe(buffer, metadata, boxId) {
  if (!buffer?.length) throw new Error('No se recibió ninguna imagen');
  if (metadata?.type !== 'image/png') throw new Error('La imagen de fondo debe ser un archivo PNG');
  const storage = requireSupabase().storage.from('bonos');
  const path = `backgrounds/${boxId}.png`;
  const { error } = await storage.upload(path, buffer, { contentType: 'image/png', upsert: true });
  if (error) throw new Error(`No se pudo subir la imagen de fondo: ${error.message}`);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const spaces = await readSpaces();
    const space = spaces.find((item) => item.id === boxId) || spaces[0];
    const config = normalizeConfig(space.config);
    space.config = { ...config, branding: { ...config.branding, backgroundImagePath: path } };
    try {
      const updatedAt = await writeSpaces(spaces, spaces.updatedAt);
      return { path, updatedAt };
    } catch (error) {
      if (error.code !== 'ERR_CONCURRENCY_CONFLICT' || attempt === 2) throw error;
    }
  }
  throw new Error('No se pudo guardar la imagen de fondo');
}
export const uploadBoxBackground = (buffer, metadata, boxId) => withBonusOperationLock(() => uploadBoxBackgroundUnsafe(buffer, metadata, boxId));
export async function downloadBoxBackground(boxId) {
  const space = await getSpace(boxId);
  const path = normalizeConfig(space.config).branding.backgroundImagePath;
  if (!path) throw new Error('La caja no tiene imagen de fondo');
  const { data, error } = await requireSupabase().storage.from('bonos').download(path);
  if (error) throw new Error(`No se pudo descargar la imagen de fondo: ${error.message}`);
  return { data, name: `${space.id}-fondo.png`, type: 'image/png' };
}
async function deleteBoxBackgroundUnsafe(boxId, clientUpdatedAt = null) {
  const spaces = await readSpaces();
  const space = spaces.find((item) => item.id === boxId) || spaces[0];
  const config = normalizeConfig(space.config);
  if (config.branding.backgroundImagePath) {
    const { error } = await requireSupabase().storage.from('bonos').remove([config.branding.backgroundImagePath]);
    if (error) throw new Error(`No se pudo eliminar la imagen de fondo: ${error.message}`);
  }
  space.config = { ...config, branding: { ...config.branding, backgroundImagePath: '' } };
  const updatedAt = await writeSpaces(spaces, clientUpdatedAt ?? spaces.updatedAt);
  return { updatedAt };
}
export const deleteBoxBackground = (boxId, clientUpdatedAt = null) => withBonusOperationLock(() => deleteBoxBackgroundUnsafe(boxId, clientUpdatedAt));
const thumbnailPathFor = (spaceId, imagePath) => {
  const fileName = String(imagePath || '').split('/').pop();
  return fileName ? `mini-${spaceId}/${fileName}` : '';
};
export async function createBonusThumbnails() {
  const spaces = await readSpaces();
  const storage = requireSupabase().storage.from('bonos');
  let created = 0;
  let skipped = 0;
  let failed = 0;
  for (const space of spaces) {
    const config = normalizeConfig(space.config);
    for (const bonus of config.bonuses) {
      if (!bonus.imagePath) { skipped += 1; continue; }
      try {
        const { data, error } = await storage.download(bonus.imagePath);
        if (error) throw new Error(error.message);
        const thumbnail = await sharp(Buffer.from(await data.arrayBuffer()))
          .resize({ width: 180, height: 320, fit: 'inside', withoutEnlargement: true })
          .png({ compressionLevel: 9, palette: true })
          .toBuffer();
        const { error: uploadError } = await storage.upload(thumbnailPathFor(space.id, bonus.imagePath), thumbnail, { contentType: 'image/png', upsert: true });
        if (uploadError) throw new Error(uploadError.message);
        created += 1;
      } catch (error) {
        failed += 1;
        console.error(`No se pudo crear la miniatura de ${space.id}/${bonus.id}: ${error.message}`);
      }
    }
  }
  return { created, skipped, failed };
}
export async function downloadBonusImage(id, boxId, mini = false) {
  const spaces = await readSpaces(); const space = spaces.find((item) => item.id === boxId) || spaces[0]; const bonus = normalizeConfig(space.config).bonuses.find((item) => item.id === id); if (!bonus?.imagePath) throw new Error('El bono no tiene imagen');
  const storage = requireSupabase().storage.from('bonos');
  let { data, error } = await storage.download(mini ? thumbnailPathFor(space.id, bonus.imagePath) : bonus.imagePath);
  if (mini && error) ({ data, error } = await storage.download(bonus.imagePath));
  if (error) throw new Error(`No se pudo descargar la imagen: ${error.message}`);
  const originalName = bonus.imageName || bonus.imagePath.split('/').pop() || `${id}.bin`;
  const extension = originalName.includes('.') ? originalName.split('.').pop().replace(/[^a-z0-9]/gi, '').toLowerCase() : 'bin';
  const safeBonusName = bonus.name.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '').replace(/[. ]+$/g, '').trim() || id;
  return { data, name: `${safeBonusName}.${extension || 'bin'}`, type: bonus.imageType || 'application/octet-stream' };
}
export async function updateCurrent(patch, boxId, clientUpdatedAt = null) {
  const { updatedAt: _ignoredUpdatedAt, ...currentPatch } = patch || {};
  const spaces = await readSpaces();
  const space = spaces.find((item) => item.id === boxId) || spaces[0];
  const current = { ...space.cajas.at(-1), ...currentPatch };
  if (Array.isArray(currentPatch.accounts)) {
    currentPatch.accounts.forEach((account) => {
      Object.entries(account.values || {}).forEach(([wallet, value]) => {
        const setting = space.config?.accounts?.walletSettings?.[account.holder]?.[wallet];
        if (!['Depósitos', 'Compartidas', 'Ahorro'].includes(setting?.category)) return;
        spaces.forEach((targetSpace) => {
          const targetAccount = targetSpace.cajas.at(-1).accounts.find((item) => item.holder === account.holder);
          const targetSetting = targetSpace.config?.accounts?.walletSettings?.[account.holder]?.[wallet];
          if (targetAccount && ['Depósitos', 'Compartidas', 'Ahorro'].includes(targetSetting?.category)) {
            targetAccount.values[wallet] = value;
            targetAccount.verified = { ...(targetAccount.verified || {}), [wallet]: account.verified?.[wallet] };
            targetAccount.notes = { ...(targetAccount.notes || {}), [wallet]: account.notes?.[wallet] };
          }
        });
      });
    });
  }
  if (currentPatch.advertising) {
    spaces.forEach((targetSpace) => {
      targetSpace.cajas.at(-1).advertising = structuredClone(patch.advertising);
    });
  }
  space.cajas[space.cajas.length - 1] = current;
  const updatedAt = await writeSpaces(spaces, clientUpdatedAt ?? spaces.updatedAt);
  return { ...current, updatedAt, lastSavedAt: space.lastSavedAt || null };
}
export async function updateCaja(id, patch, boxId, clientUpdatedAt = null) {
  const { updatedAt: _ignoredUpdatedAt, ...historicalPatch } = patch || {};
  const spaces = await readSpaces();
  const space = spaces.find((item) => item.id === boxId) || spaces[0];
  const index = space.cajas.findIndex((caja) => String(caja.id) === String(id));
  if (index === -1) throw new Error('Caja no encontrada');
  space.cajas[index] = { ...space.cajas[index], ...historicalPatch, id: space.cajas[index].id };
  const updatedAt = await writeSpaces(spaces, clientUpdatedAt ?? spaces.updatedAt);
  return { ...space.cajas[index], updatedAt, lastSavedAt: space.lastSavedAt || null };
}
export async function setWalletAssignment({ holder, wallet, boxId, updatedAt: clientUpdatedAt }) {
  const spaces = await readSpaces();
  if (boxId && !spaces.some((space) => space.id === boxId)) throw new Error('Caja no encontrada');
  const assignmentUpdatedAt = new Date().toISOString();
  spaces.forEach((space) => {
    const current = space.cajas.at(-1);
    const account = current.accounts.find((item) => item.holder === holder);
    if (!account || !(wallet in (account.values || {}))) return;
    account.walletBoxes = { ...(account.walletBoxes || {}), [wallet]: boxId || '' };
    account.walletBoxUpdatedAt = { ...(account.walletBoxUpdatedAt || {}), [wallet]: assignmentUpdatedAt };
  });
  const updatedAt = await writeSpaces(spaces, clientUpdatedAt ?? spaces.updatedAt);
  return { currents: Object.fromEntries(spaces.map((space) => [space.id, { ...space.cajas.at(-1), updatedAt, lastSavedAt: space.lastSavedAt || null }])), updatedAt };
}
export async function createTransfer({ fromBoxId, toBoxId, amount, note = '', updatedAt: clientUpdatedAt }) {
  if (!fromBoxId || !toBoxId || fromBoxId === toBoxId) throw new Error('Seleccioná dos cajas diferentes');
  const value = Number(amount) || 0;
  if (value <= 0) throw new Error('El monto debe ser mayor a cero');
  const spaces = await readSpaces(); const from = spaces.find((space) => space.id === fromBoxId); const to = spaces.find((space) => space.id === toBoxId);
  if (!from || !to) throw new Error('Caja de origen o destino no encontrada');
  const transfer = { id: crypto.randomUUID(), fromBoxId, toBoxId, amount: value, note: String(note || ''), createdAt: new Date().toISOString() };
  from.cajas.at(-1).transfers = [...(from.cajas.at(-1).transfers || []), transfer];
  to.cajas.at(-1).transfers = [...(to.cajas.at(-1).transfers || []), transfer];
  const updatedAt = await writeSpaces(spaces, clientUpdatedAt ?? spaces.updatedAt);
  return { transfer, from: { ...from.cajas.at(-1), updatedAt, lastSavedAt: from.lastSavedAt || null }, to: { ...to.cajas.at(-1), updatedAt, lastSavedAt: to.lastSavedAt || null }, updatedAt };
}
export async function updateTransfer(id, patch) {
  const { updatedAt: clientUpdatedAt, ...transferPatch } = patch || {};
  const spaces = await readSpaces(); const allCurrent = spaces.map((space) => ({ space, current: space.cajas.at(-1) })); const original = allCurrent.find(({ current }) => current.transfers?.some((transfer) => transfer.id === id))?.current?.transfers?.find((transfer) => transfer.id === id);
  if (!original) throw new Error('Traspaso no encontrado');
  const fromBoxId = transferPatch.fromBoxId || original.fromBoxId; const toBoxId = transferPatch.toBoxId || original.toBoxId; const amount = Number(transferPatch.amount ?? original.amount) || 0;
  if (!fromBoxId || !toBoxId || fromBoxId === toBoxId) throw new Error('Seleccioná dos cajas diferentes');
  if (amount <= 0) throw new Error('El monto debe ser mayor a cero');
  if (!spaces.some((space) => space.id === fromBoxId) || !spaces.some((space) => space.id === toBoxId)) throw new Error('Caja de origen o destino no encontrada');
  const updated = { ...original, fromBoxId, toBoxId, amount, note: transferPatch.note ?? original.note, updatedAt: new Date().toISOString() };
  allCurrent.forEach(({ current }) => { current.transfers = (current.transfers || []).filter((transfer) => transfer.id !== id); });
  spaces.find((space) => space.id === fromBoxId).cajas.at(-1).transfers.push(updated);
  spaces.find((space) => space.id === toBoxId).cajas.at(-1).transfers.push(updated);
  const updatedAt = await writeSpaces(spaces, clientUpdatedAt ?? spaces.updatedAt); return { transfer: updated, currents: Object.fromEntries(spaces.map((space) => [space.id, { ...space.cajas.at(-1), updatedAt, lastSavedAt: space.lastSavedAt || null }])), updatedAt };
}
export async function deleteTransfer(id, clientUpdatedAt = null) {
  const spaces = await readSpaces(); let found = false;
  spaces.forEach((space) => { const current = space.cajas.at(-1); const transfers = current.transfers || []; if (transfers.some((transfer) => transfer.id === id)) found = true; current.transfers = transfers.filter((transfer) => transfer.id !== id); });
  if (!found) throw new Error('Traspaso no encontrado'); const updatedAt = await writeSpaces(spaces, clientUpdatedAt ?? spaces.updatedAt); return { currents: Object.fromEntries(spaces.map((space) => [space.id, { ...space.cajas.at(-1), updatedAt, lastSavedAt: space.lastSavedAt || null }])), updatedAt };
}
function renameKeys(source, renames) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return source;
  return Object.fromEntries(Object.entries(source).map(([key, value]) => [renames[key] || key, value]));
}
function namesByIndex(previous, next) {
  const renames = {};
  (previous || []).forEach((name, index) => {
    const nextName = next?.[index];
    if (name && nextName && name !== nextName) renames[name] = nextName;
  });
  return renames;
}
function namesByEntity(previousEntities, nextEntities, previousNames, nextNames) {
  if (!Array.isArray(previousEntities) || !previousEntities.length || !Array.isArray(nextEntities) || !nextEntities.length) return namesByIndex(previousNames, nextNames);
  const nextById = new Map(nextEntities.filter((entity) => entity?.id).map((entity) => [entity.id, entity.name]));
  return Object.fromEntries(previousEntities.map((entity) => [entity.name, nextById.get(entity.id)]).filter(([, name]) => name));
}
function assertRenameSafety(renames, previousNames, label) {
  const targets = Object.values(renames).filter((name) => name);
  if (new Set(targets).size !== targets.length) throw new Error(`No se guardó: el renombrado de ${label} genera nombres duplicados.`);
  const previous = new Set(previousNames);
  Object.entries(renames).forEach(([source, target]) => {
    if (source !== target && previous.has(target) && !renames[target]) throw new Error(`No se guardó: no se puede renombrar ${label} "${source}" sobre "${target}" porque ese nombre ya tiene datos. Renombralo primero a otro nombre.`);
  });
}
function assertUniqueNames(names, label) {
  const meaningful = names.filter((name) => String(name || '').trim());
  if (new Set(meaningful).size !== meaningful.length) throw new Error(`No se guardó: hay nombres repetidos en ${label}. Cada elemento debe conservar una identidad única.`);
}
function assertUniqueEntityIds(entities, label) {
  const ids = entities.map((entity) => entity?.id).filter(Boolean);
  if (new Set(ids).size !== ids.length) throw new Error(`No se guardó: hay IDs repetidos en ${label}. No se modificaron los datos.`);
}
function migrateConfigMaps(config, holderRenames, walletRenames, platformRenames) {
  const next = structuredClone(config || {});
  const accounts = next.accounts || {};
  accounts.availability = Object.fromEntries(Object.entries(accounts.availability || {}).map(([holder, values]) => [holderRenames[holder] || holder, renameKeys(values, walletRenames)]));
  accounts.walletSettings = Object.fromEntries(Object.entries(accounts.walletSettings || {}).map(([holder, values]) => [holderRenames[holder] || holder, renameKeys(values, walletRenames)]));
  accounts.walletModes = renameKeys(accounts.walletModes, walletRenames);
  next.platformColors = renameKeys(next.platformColors, platformRenames);
  next.platformEnabled = renameKeys(next.platformEnabled, platformRenames);
  next.accounts = accounts;
  if (next.logistics) {
    const keyRename = (key) => {
      const [holder, wallet] = String(key).split('::');
      return `${holderRenames[holder] || holder}::${walletRenames[wallet] || wallet}`;
    };
    next.logistics = Object.fromEntries(Object.entries(next.logistics).map(([name, values]) => [name, Array.isArray(values) ? values.map(keyRename) : values]));
  }
  return next;
}
function migrateHistoricalReferences(spaces, holderRenames, walletRenames, platformRenames, config) {
  const resolvedPlatformRenames = { ...platformRenames };
  spaces.forEach((space) => space.cajas.forEach((caja) => {
    (caja.chips || []).forEach((chip, index) => {
      if (!config.platformEntities.some((entity) => entity.name === chip.platform) && config.platforms[index]) resolvedPlatformRenames[chip.platform] = config.platforms[index];
    });
  }));
  spaces.forEach((space) => space.cajas.forEach((caja) => {
    (caja.accounts || []).forEach((account) => {
      const previousHolder = account.holder;
      account.holder = holderRenames[previousHolder] || previousHolder;
      account.holderId = config.accounts.holderEntities.find((entity) => entity.name === account.holder)?.id || account.holderId;
      account.values = renameKeys(account.values, walletRenames);
      account.walletBoxes = renameKeys(account.walletBoxes, walletRenames);
      account.walletBoxUpdatedAt = renameKeys(account.walletBoxUpdatedAt, walletRenames);
      account.walletRestartAt = renameKeys(account.walletRestartAt, walletRenames);
      account.verified = renameKeys(account.verified, walletRenames);
      account.notes = renameKeys(account.notes, walletRenames);
      account.walletIds = { ...renameKeys(account.walletIds, walletRenames), ...Object.fromEntries(config.accounts.walletEntities.map((entity) => [entity.name, entity.id])) };
    });
    (caja.foundMoney || []).forEach((record) => {
      record.holder = holderRenames[record.holder] || record.holder;
      record.wallet = walletRenames[record.wallet] || record.wallet;
      record.holderId = config.accounts.holderEntities.find((entity) => entity.name === record.holder)?.id || record.holderId;
      record.walletId = config.accounts.walletEntities.find((entity) => entity.name === record.wallet)?.id || record.walletId;
    });
    (caja.chips || []).forEach((chip) => { chip.platform = resolvedPlatformRenames[chip.platform] || chip.platform; chip.platformId = config.platformEntities.find((entity) => entity.name === chip.platform)?.id || chip.platformId; });
    (caja.chipLoads || []).forEach((load) => { load.platform = resolvedPlatformRenames[load.platform] || load.platform; load.platformId = config.platformEntities.find((entity) => entity.name === load.platform)?.id || load.platformId; });
  }));
}
export async function updateConfig(config, boxId, clientUpdatedAt = null) {
  const { updatedAt: _ignoredUpdatedAt, ...configPatch } = config || {};
  const spaces = await readSpaces(); const space = spaces.find((item) => item.id === boxId) || spaces[0]; const previousConfig = normalizeConfig(space.config); const nextAccounts = configPatch?.accounts || {}; const nextPlatforms = Array.isArray(configPatch?.platforms) ? configPatch.platforms : previousConfig.platforms;
  assertUniqueNames(nextAccounts.holders || previousConfig.accounts.holders, 'titulares'); assertUniqueNames(nextAccounts.wallets || previousConfig.accounts.wallets, 'billeteras'); assertUniqueNames(nextPlatforms, 'plataformas');
  assertUniqueEntityIds(nextAccounts.holderEntities || previousConfig.accounts.holderEntities, 'titulares'); assertUniqueEntityIds(nextAccounts.walletEntities || previousConfig.accounts.walletEntities, 'billeteras'); assertUniqueEntityIds(configPatch?.platformEntities || previousConfig.platformEntities, 'plataformas');
  const holderRenames = namesByEntity(previousConfig.accounts.holderEntities, nextAccounts.holderEntities, previousConfig.accounts.holders, nextAccounts.holders); const walletRenames = namesByEntity(previousConfig.accounts.walletEntities, nextAccounts.walletEntities, previousConfig.accounts.wallets, nextAccounts.wallets); const platformRenames = namesByEntity(previousConfig.platformEntities, configPatch?.platformEntities, previousConfig.platforms, nextPlatforms);
  assertRenameSafety(holderRenames, previousConfig.accounts.holders, 'titulares'); assertRenameSafety(walletRenames, previousConfig.accounts.wallets, 'billeteras'); assertRenameSafety(platformRenames, previousConfig.platforms, 'plataformas');
  const normalized = normalizeConfig(migrateConfigMaps(configPatch, holderRenames, walletRenames, platformRenames));
  migrateHistoricalReferences([space], holderRenames, walletRenames, platformRenames, normalized);
  spaces.forEach((targetSpace) => { targetSpace.config = { ...normalizeConfig(targetSpace.config), monthlyGoal: normalized.monthlyGoal, savingsGoal: normalized.savingsGoal }; }); space.config = normalized;
  const current = space.cajas.at(-1); const existing = new Map(current.accounts.map((account) => [account.holder, account]));
  const configuredHolderIds = new Set(normalized.accounts.holderEntities.map((entity) => entity.id));
  const configuredPlatformIds = new Set(normalized.platformEntities.map((entity) => entity.id));
  current.accounts = [...normalized.accounts.holders.map((holder) => { const account = existing.get(holder); return { holder, holderId: normalized.accounts.holderEntities.find((entity) => entity.name === holder)?.id, values: { ...(account?.values || {}), ...Object.fromEntries(normalized.accounts.wallets.map((wallet) => [wallet, account?.values?.[wallet] ?? 0])) }, walletIds: { ...(account?.walletIds || {}), ...Object.fromEntries(normalized.accounts.walletEntities.map((entity) => [entity.name, entity.id])) }, walletBoxes: account?.walletBoxes || {}, walletBoxUpdatedAt: account?.walletBoxUpdatedAt || {}, walletRestartAt: account?.walletRestartAt || {}, verified: account?.verified || {}, notes: account?.notes || {} }; }), ...current.accounts.filter((account) => !configuredHolderIds.has(account.holderId) && !normalized.accounts.holders.includes(account.holder))];
  current.chips = [...normalized.platforms.map((platform) => { const chip = current.chips.find((item) => item.platform === platform); return { platform, platformId: normalized.platformEntities.find((entity) => entity.name === platform)?.id, initial: chip?.initial ?? 0, final: chip?.final ?? 0 }; }), ...current.chips.filter((chip) => !configuredPlatformIds.has(chip.platformId) && !normalized.platforms.includes(chip.platform))];
  current.expenses = current.expenses.map((expense) => ({ ...expense, category: normalized.expenses.some((item) => item.name === expense.category) ? expense.category : normalized.expenses[0]?.name || 'Gasto' }));
  space.cajas[space.cajas.length - 1] = current; const updatedAt = await writeSpaces(spaces, clientUpdatedAt ?? spaces.updatedAt); return { config: normalized, current: { ...current, updatedAt, lastSavedAt: space.lastSavedAt || null }, updatedAt };
}
function walletBelongsToBox(row, wallet, config, boxId) {
  const setting = config.accounts.walletSettings?.[row.holder]?.[wallet];
  return setting?.category !== 'Ahorro' && config.accounts.availability?.[row.holder]?.[wallet] !== false && (!setting?.category || setting.category === 'Normal' || row.walletBoxes?.[wallet] === boxId);
}
export async function closeCurrent(patch = {}, boxId, clientUpdatedAt = null) { const { updatedAt: _ignoredUpdatedAt, ...closePatch } = patch || {}; const spaces = await readSpaces(); const space = spaces.find((item) => item.id === boxId) || spaces[0]; const config = normalizeConfig(space.config); const source = closePatch.accounts || space.cajas.at(-1).accounts; const accountsTotal = source.flatMap((row) => Object.entries(row.values || {}).filter(([wallet]) => walletBelongsToBox(row, wallet, config, space.id)).map(([, value]) => value)).reduce((sum, value) => sum + (Number(value) || 0), 0); const current = { ...space.cajas.at(-1), ...closePatch, cashFinal: accountsTotal }; if (current.status === 'CERRADA') throw new Error('La caja ya está cerrada'); current.status = 'CERRADA'; current.closedAt = new Date().toISOString(); space.cajas[space.cajas.length - 1] = current; const nextCaja = blankCaja(current.id + 1, current, space.config); space.cajas.push(nextCaja); const updatedAt = await writeSpaces(spaces, clientUpdatedAt ?? spaces.updatedAt); return { ...nextCaja, updatedAt, lastSavedAt: space.lastSavedAt || null }; }
export { billeteras, titulares, plataformas };
