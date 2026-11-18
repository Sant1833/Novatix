'use strict';

const express = require('express');
const mysql = require('mysql2/promise');
const path = require('node:path');

const PORT = Number(process.env.PORT || 8080);
const password = process.env.REPORTES_DB_PASSWORD || process.env.USUARIOS_DB_PASSWORD;

if (typeof password !== 'string') {
  console.error('Falta REPORTES_DB_PASSWORD en .env.dashboard');
  process.exitCode = 1;
  throw new Error('Configuracion SQL de reportes_db incompleta');
}

const pool = mysql.createPool({
  host: process.env.REPORTES_DB_HOST || '192.168.100.5',
  port: 3306,
  user: process.env.REPORTES_DB_USER || 'novatix_user',
  password,
  database: process.env.REPORTES_DB_NAME || 'reportes_db',
  waitForConnections: true,
  connectionLimit: 4,
  queueLimit: 20,
  connectTimeout: 5000,
  enableKeepAlive: true,
});

async function sql(statement, params = []) {
  const [rows] = await pool.query({ sql: statement, timeout: 12000 }, params);
  return rows;
}

const num = value => Number(value || 0);
const memo = new Map();

async function dashboard(leagueFilter) {
  const whereLeague = leagueFilter && leagueFilter !== 'ALL' ? ' WHERE liga = ?' : '';
  const argsLeague = leagueFilter && leagueFilter !== 'ALL' ? [leagueFilter] : [];

  const [
    teamsSummary,
    leaguesSummary,
    trendsSummary,
    topTeams,
    leaguesList,
    allLeagues,
    trendsList,
  ] = await Promise.all([
    sql(`SELECT COUNT(*) AS equipos, COALESCE(SUM(cantidad_apuestas),0) AS apuestas, COALESCE(SUM(volumen_apostado),0) AS volumen, COALESCE(SUM(total_pagado),0) AS pagado, COALESCE(SUM(balance_casa),0) AS balance, COALESCE(AVG(cuota_promedio),0) AS cuota FROM reporte_top_equipos${whereLeague}`, argsLeague),
    sql(`SELECT COUNT(*) AS ligas, COALESCE(SUM(total_partidos),0) AS partidos, COALESCE(AVG(promedio_goles),0) AS goles_prom, COALESCE(AVG(prob_implicita_local_pct),0) AS prob_local FROM reporte_ligas${whereLeague}`, argsLeague),
    sql('SELECT COALESCE(SUM(cantidad_partidos),0) AS total_partidos FROM reporte_tendencias'),
    sql(`SELECT nombre, pais, liga, cantidad_apuestas, volumen_apostado, total_pagado, cuota_promedio, balance_casa FROM reporte_top_equipos${whereLeague} ORDER BY volumen_apostado DESC LIMIT 12`, argsLeague),
    sql(`SELECT pais, liga, total_partidos, promedio_goles, cuota_local_prom, cuota_visitante_prom, prob_implicita_local_pct FROM reporte_ligas${whereLeague} ORDER BY total_partidos DESC LIMIT 12`, argsLeague),
    sql('SELECT DISTINCT liga FROM reporte_ligas WHERE liga IS NOT NULL ORDER BY liga ASC'),
    sql('SELECT desenlace, cantidad_partidos, cuota_local_media, cuota_empate_media, cuota_visitante_media FROM reporte_tendencias ORDER BY cantidad_partidos DESC'),
  ]);

  const ts = teamsSummary[0] || {};
  const ls = leaguesSummary[0] || {};
  const tr = trendsSummary[0] || {};

  return {
    updatedAt: new Date().toISOString(),
    source: 'Apache Spark · reportes_db',
    availableLeagues: allLeagues.map(r => r.liga),
    totals: {
      equipos: num(ts.equipos),
      apuestas: num(ts.apuestas),
      volumenApostado: num(ts.volumen),
      totalPagado: num(ts.pagado),
      balanceCasa: num(ts.balance),
      cuotaMedia: num(ts.cuota),
      ligas: num(ls.ligas),
      partidosLiga: num(ls.partidos),
      golesPromedio: num(ls.goles_prom),
      probLocalMedia: num(ls.prob_local),
      partidosTendencias: num(tr.total_partidos),
    },
    topTeams: topTeams.map(r => ({
      name: r.nombre,
      pais: r.pais,
      liga: r.liga,
      apuestas: num(r.cantidad_apuestas),
      volumen: num(r.volumen_apostado),
      pagado: num(r.total_pagado),
      cuota: num(r.cuota_promedio),
      balance: num(r.balance_casa),
    })),
    leagues: leaguesList.map(r => ({
      pais: r.pais,
      liga: r.liga,
      partidos: num(r.total_partidos),
      goles: num(r.promedio_goles),
      cuotaLocal: num(r.cuota_local_prom),
      cuotaVisitante: num(r.cuota_visitante_prom),
      probLocal: num(r.prob_implicita_local_pct),
    })),
    trends: trendsList.map(r => ({
      name: r.desenlace,
      value: num(r.cantidad_partidos),
      cuotaLocal: num(r.cuota_local_media),
      cuotaEmpate: num(r.cuota_empate_media),
      cuotaVisitante: num(r.cuota_visitante_media),
    })),
  };
}

const app = express();
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

app.get('/api/health', (_req, res) =>
  res.json({ ok: true, service: 'novatix-dashboard-spark', version: '2.0.0' })
);

app.get('/api/dashboard', async (req, res) => {
  const liga = typeof req.query.liga === 'string' && req.query.liga.trim() ? req.query.liga.trim() : 'ALL';
  const hit = memo.get(liga);
  if (hit && Date.now() - hit.at < 20000) return res.json(hit.data);
  try {
    const data = await dashboard(liga);
    memo.set(liga, { at: Date.now(), data });
    res.json(data);
  } catch (err) {
    console.error('Error consultando reportes_db (Spark):', err.code || err.message);
    res.status(503).json({ error: 'No se pudo consultar reportes_db en MySQL. Verifica el servicio.' });
  }
});

const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Ruta de API no encontrada' });
  res.sendFile(path.join(publicDir, 'index.html'));
});

const server = app.listen(PORT, '0.0.0.0', () =>
  console.log(`NOVATIX Dashboard (100% Apache Spark) escuchando en ${PORT}`)
);

function shutdown() {
  server.close(() => {
    pool.end().finally(() => { process.exitCode = 0; });
  });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
