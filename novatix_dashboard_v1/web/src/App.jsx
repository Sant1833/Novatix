import React, { useEffect, useState } from 'react';
import {
  Activity, ArrowRight, BarChart3, ChevronDown, CircleDollarSign, Database,
  Download, Filter, GitBranch, LayoutDashboard, Layers3, Menu, RefreshCw,
  Server, ShieldCheck, Sparkles, Ticket, TrendingUp, Trophy, Wallet, X,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, PieChart, Pie, Cell, Legend, ComposedChart, Line,
} from 'recharts';

const nf = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
const dec = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 });
const money = n => `$${compact.format(Number(n || 0))} COP`;
const CHART_TOOLTIP = { background: '#121b31', border: '1px solid #30405a', borderRadius: 12, color: '#e9effa', fontSize: 12 };
const PIE_COLORS = { Local: '#2cd9a2', Visitante: '#7a82f1', Empate: '#f39a65' };

const MENU = [
  { key: 'resumen', label: 'Resumen Spark', icon: LayoutDashboard },
  { key: 'equipos', label: 'Top Equipos', icon: Trophy },
  { key: 'ligas', label: 'Análisis de Ligas', icon: Ticket },
  { key: 'infraestructura', label: 'Arquitectura Spark', icon: Server },
];

function Card({ children, className = '', title, description, action }) {
  return (
    <section className={`panel ${className}`}>
      {(title || description) && (
        <div className="panel-heading">
          <div>
            <h3>{title}</h3>
            {description && <p>{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

function Metric({ name, value, caption, icon: Icon, gradient = 'teal', foot }) {
  return (
    <div className={`metric metric-${gradient}`}>
      <div className="metric-top">
        <span>{name}</span>
        <div className="metric-icon"><Icon size={18} /></div>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-bottom">
        <span>{caption}</span>
        {foot && <span className="metric-foot">{foot}</span>}
      </div>
    </div>
  );
}

function Empty({ label = 'Sin registros procesados por Spark para este filtro' }) {
  return (
    <div className="empty">
      <BarChart3 size={26} />
      <span>{label}</span>
    </div>
  );
}

function GraphTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="graph-tooltip">
      <strong>{label}</strong>
      {payload.map((p, i) => (
        <div key={i}>
          <span className="t-dot" style={{ background: p.color || p.fill }} />
          {p.name}: <b>{typeof p.value === 'number' && !Number.isInteger(p.value) ? dec.format(p.value) : nf.format(p.value)}</b>
        </div>
      ))}
    </div>
  );
}

function TrendsDonut({ data = [] }) {
  const total = data.reduce((s, x) => s + x.value, 0);
  if (!total) return <Empty />;
  return (
    <div className="result-flex">
      <div className="donut-wrap">
        <ResponsiveContainer width="100%" height={210}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={67} outerRadius={90} paddingAngle={3} stroke="none">
              {data.map((x, i) => <Cell key={i} fill={PIE_COLORS[x.name] || '#6679a6'} />)}
            </Pie>
            <Tooltip contentStyle={CHART_TOOLTIP} formatter={v => nf.format(v)} />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center">
          <b>{nf.format(total)}</b>
          <span>partidos</span>
        </div>
      </div>
      <div className="legend-stack">
        {data.map(x => (
          <div className="legend-item" key={x.name}>
            <div className="legend-label">
              <span className="legend-dot" style={{ background: PIE_COLORS[x.name] || '#6679a6' }} />
              {x.name}
            </div>
            <div className="legend-number">
              {nf.format(x.value)}
              <small>{(x.value * 100 / total).toFixed(1)} %</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SparkBanner() {
  return (
    <Card className="spark-card">
      <div className="spark-icon"><Sparkles size={21} /></div>
      <div>
        <span className="eyebrow">MOTOR ANALÍTICO · APACHE SPARK</span>
        <h3>Resultados 100% procesados con Spark SQL</h3>
        <p>Todas las métricas, gráficas y comparativas provienen exclusivamente de las tablas agregadas en reportes_db (reporte_top_equipos, reporte_ligas y reporte_tendencias).</p>
      </div>
      <span className="coming">Spark Activo</span>
    </Card>
  );
}

function App() {
  const [page, setPage] = useState('resumen');
  const [liga, setLiga] = useState('ALL');
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setBusy(true);
      setError(null);
      try {
        const query = liga !== 'ALL' ? `?liga=${encodeURIComponent(liga)}` : '';
        const response = await fetch(`/api/dashboard${query}`, { signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Error consultando reportes_db');
        setData(result);
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message);
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    }
    load();
    return () => controller.abort();
  }, [liga, refresh]);

  function exportCsv() {
    if (!data) return;
    const rows = [
      ['Equipo', 'Pais', 'Liga', 'Apuestas', 'Volumen Apostado', 'Total Pagado', 'Balance Casa', 'Cuota Promedio'],
      ...data.topTeams.map(r => [r.name, r.pais, r.liga, r.apuestas, r.volumen, r.pagado, r.balance, r.cuota]),
    ];
    const text = '\ufeff' + rows.map(cols => cols.map(c => `"${String(c ?? '').replaceAll('"', '""')}"`).join(';')).join('\r\n');
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `novatix_spark_${liga}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const t = data?.totals || {};
  const pageLabel = MENU.find(m => m.key === page)?.label || 'Dashboard Spark';

  return (
    <div className="shell">
      <aside className={`sidebar ${navOpen ? 'open' : ''}`}>
        <div className="sidebar-top">
          <div className="brand">
            <div className="brand-mark"><Layers3 size={22} /></div>
            <div><strong>NOVATIX</strong><small>SPARK ANALYTICS</small></div>
          </div>
          <button className="mobile-close" onClick={() => setNavOpen(false)} aria-label="Cerrar menú"><X size={20} /></button>
        </div>
        <div className="sidebar-divider" />
        <div className="menu-caption">ANALÍTICA SPARK</div>
        <nav aria-label="Menú principal">
          {MENU.map(m => (
            <button
              key={m.key}
              className={`nav-item ${page === m.key ? 'active' : ''}`}
              onClick={() => { setPage(m.key); setNavOpen(false); }}
            >
              <m.icon size={18} />
              <span>{m.label}</span>
              {page === m.key && <span className="nav-line" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-push" />
        <div className="sidebar-feature">
          <div className="feature-glow" />
          <Sparkles size={20} />
          <strong>Apache Spark + MySQL</strong>
          <small>Base analítica: reportes_db</small>
          <span><span className="live-dot" />3 reportes sincronizados</span>
        </div>
        <div className="sidebar-foot">
          <div className="user-avatar">S</div>
          <div><strong>Proyecto académico</strong><span>Big Data · Spark 2026</span></div>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div className="topbar-left">
            <button className="mobile-toggle" onClick={() => setNavOpen(true)} aria-label="Abrir menú"><Menu size={20} /></button>
            <div className="breadcrumb"><span>Apache Spark · reportes_db</span><span className="breadcrumb-sep">/</span><strong>{pageLabel}</strong></div>
          </div>
          <div className="topbar-right">
            <span className="desktop-only"><span className="live-dot" /> Clúster Spark conectado</span>
            <button className="icon-btn" onClick={() => setRefresh(x => x + 1)} aria-label="Actualizar" title="Recargar datos de Spark">
              <RefreshCw size={18} className={busy ? 'spin' : ''} />
            </button>
            <span className="top-avatar">S</span>
          </div>
        </div>

        <div className="content">
          <section className="hero">
            <div className="hero-copy">
              <div className="hero-chip"><Activity size={13} /> ANALÍTICA DISTRIBUIDA · APACHE SPARK</div>
              <h1>
                {page === 'resumen' ? 'Inteligencia procesada con Spark.' :
                 page === 'equipos' ? 'Rendimiento por equipo.' :
                 page === 'ligas' ? 'Métricas y cuotas por liga.' :
                 'Arquitectura Big Data.'}
              </h1>
              <p>
                {page === 'resumen' ? 'Visualización integral de los agregados generados por Apache Spark en reportes_db: top equipos, ligas y desenlaces.' :
                 page === 'equipos' ? 'Comparativa de volumen apostado, pagos realizados, balance de la casa y cuotas medias calculadas por Spark.' :
                 page === 'ligas' ? 'Promedio de goles, probabilidad implícita local y comportamiento de cuotas entre competiciones.' :
                 'Flujo completo desde los microservicios MySQL hacia el procesamiento en Apache Spark y visualización en Swarm.'}
              </p>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <div className="orbit-core"><Sparkles size={52} strokeWidth={1.5} /></div>
              <div className="orb-dot orb-a" /><div className="orb-dot orb-b" /><div className="orb-dot orb-c" />
            </div>
          </section>

          <div className="toolbar">
            <div className="section-intro">
              <div className="eyebrow">REPORTE ANALÍTICO · SPARK SQL</div>
              <h2>{pageLabel}</h2>
              <p>Datos consultados exclusivamente desde reportes_db (MySQL 192.168.100.5).</p>
            </div>
            <div className="tools">
              <div className="period-field">
                <Filter size={16} />
                <select aria-label="Filtrar por liga" value={liga} onChange={e => setLiga(e.target.value)}>
                  <option value="ALL">Todas las ligas (Spark)</option>
                  {(data?.availableLeagues || []).map(l => (
                    <option key={l} value={l}>Liga: {l}</option>
                  ))}
                </select>
                <ChevronDown size={15} />
              </div>
              <button className="tool-btn" onClick={exportCsv} disabled={!data} title="Exportar reporte Spark a CSV">
                <Download size={16} />Exportar CSV
              </button>
            </div>
          </div>

          {error && (
            <div className="alert-error">
              <ShieldCheck size={19} />
              <div><strong>No se pudo consultar reportes_db</strong><p>{error}</p></div>
              <button onClick={() => setRefresh(x => x + 1)}>Reintentar</button>
            </div>
          )}

          {busy && !data && <div className="loading"><div className="loading-spinner" />Cargando resultados procesados por Apache Spark…</div>}

          {data && (
            <div className={busy ? 'updating' : ''}>
              {page === 'resumen' && (
                <>
                  <div className="metrics-grid">
                    <Metric name="Volumen Apostado" value={money(t.volumenApostado)} caption="Calculado por Spark (Top Equipos)" icon={CircleDollarSign} gradient="indigo" foot={`${nf.format(t.apuestas)} apuestas`} />
                    <Metric name="Total Pagado" value={money(t.totalPagado)} caption="Premios liquidados por equipo" icon={Wallet} gradient="orange" foot={`Balance: ${money(t.balanceCasa)}`} />
                    <Metric name="Partidos Analizados" value={nf.format(t.partidosLiga)} caption={`En ${nf.format(t.ligas)} ligas procesadas`} icon={Trophy} gradient="blue" foot={`${dec.format(t.golesPromedio)} goles/partido`} />
                    <Metric name="Cuota Promedio" value={`${dec.format(t.cuotaMedia)}x`} caption="Media global en reporte_top_equipos" icon={TrendingUp} gradient="teal" foot={`Prob. local: ${dec.format(t.probLocalMedia)}%`} />
                  </div>

                  <div className="content-grid">
                    <Card className="wide" title="Volumen Apostado vs. Total Pagado (Top Equipos)" description="reportes_db.reporte_top_equipos · pesos colombianos (COP)">
                      <div className="graph-area">
                        {data.topTeams.length ? (
                          <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={data.topTeams.slice(0, 8)} margin={{ top: 14, right: 12, left: -10, bottom: 18 }}>
                              <CartesianGrid stroke="#263247" strokeDasharray="3 6" vertical={false} />
                              <XAxis dataKey="name" tick={{ fill: '#8c9ab2', fontSize: 10 }} interval={0} angle={-15} textAnchor="end" axisLine={false} tickLine={false} />
                              <YAxis tickFormatter={v => compact.format(v)} tick={{ fill: '#8c9ab2', fontSize: 11 }} axisLine={false} tickLine={false} />
                              <Tooltip content={<GraphTooltip />} />
                              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                              <Bar dataKey="volumen" name="Volumen Apostado" fill="#7a82f1" radius={[5, 5, 0, 0]} maxBarSize={24} />
                              <Bar dataKey="pagado" name="Total Pagado" fill="#2cd9a2" radius={[5, 5, 0, 0]} maxBarSize={24} />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : <Empty />}
                      </div>
                    </Card>

                    <Card title="Desenlace de Partidos (Spark)" description="reportes_db.reporte_tendencias · distribución global">
                      <TrendsDonut data={data.trends} />
                    </Card>

                    <Card title="Partidos por Liga (Spark)" description="reportes_db.reporte_ligas · volumen de encuentros">
                      <div className="graph-area">
                        {data.leagues.length ? (
                          <ResponsiveContainer width="100%" height={265}>
                            <BarChart data={data.leagues.slice(0, 8)} layout="vertical" margin={{ top: 6, right: 16, left: 6, bottom: 0 }}>
                              <CartesianGrid stroke="#263247" strokeDasharray="3 6" horizontal={false} />
                              <XAxis type="number" hide />
                              <YAxis type="category" dataKey="liga" width={75} tick={{ fill: '#bac7da', fontSize: 11 }} axisLine={false} tickLine={false} />
                              <Tooltip content={<GraphTooltip />} />
                              <Bar dataKey="partidos" name="Partidos" radius={[0, 5, 5, 0]} fill="#3ad6ba" barSize={14} />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : <Empty />}
                      </div>
                    </Card>

                    <Card title="Cuotas Medias por Desenlace (Spark)" description="reportes_db.reporte_tendencias · comparativa de cuotas">
                      <div className="graph-area">
                        {data.trends.length ? (
                          <ResponsiveContainer width="100%" height={265}>
                            <BarChart data={data.trends} margin={{ top: 14, right: 12, left: -18, bottom: 0 }}>
                              <CartesianGrid stroke="#263247" strokeDasharray="3 6" vertical={false} />
                              <XAxis dataKey="name" tick={{ fill: '#bac7da', fontSize: 11 }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fill: '#8c9ab2', fontSize: 11 }} axisLine={false} tickLine={false} />
                              <Tooltip content={<GraphTooltip />} />
                              <Legend wrapperStyle={{ fontSize: 11 }} />
                              <Bar dataKey="cuotaLocal" name="Cuota Local" fill="#2cd9a2" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="cuotaEmpate" name="Cuota Empate" fill="#f39a65" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="cuotaVisitante" name="Cuota Visitante" fill="#7a82f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : <Empty />}
                      </div>
                    </Card>
                  </div>
                  <SparkBanner />
                </>
              )}

              {page === 'equipos' && (
                <>
                  <div className="metrics-grid three">
                    <Metric name="Equipos en Ranking" value={nf.format(t.equipos)} caption="Registros en reporte_top_equipos" icon={Trophy} gradient="indigo" />
                    <Metric name="Balance de la Casa" value={money(t.balanceCasa)} caption="Volumen apostado menos pagado" icon={CircleDollarSign} gradient="teal" />
                    <Metric name="Apuestas Totales" value={nf.format(t.apuestas)} caption="Suma agregada por Spark" icon={Ticket} gradient="orange" />
                  </div>

                  <Card title="Ranking de Balance y Volumen por Equipo" description="reportes_db.reporte_top_equipos · Top 12 equipos procesados">
                    <div className="graph-area">
                      {data.topTeams.length ? (
                        <ResponsiveContainer width="100%" height={290}>
                          <ComposedChart data={data.topTeams} margin={{ top: 14, right: 14, left: -8, bottom: 20 }}>
                            <CartesianGrid stroke="#263247" strokeDasharray="3 6" vertical={false} />
                            <XAxis dataKey="name" tick={{ fill: '#8c9ab2', fontSize: 10 }} interval={0} angle={-15} textAnchor="end" axisLine={false} tickLine={false} />
                            <YAxis tickFormatter={v => compact.format(v)} tick={{ fill: '#8c9ab2', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<GraphTooltip />} />
                            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                            <Bar dataKey="volumen" name="Volumen Apostado" fill="#7a82f1" radius={[4, 4, 0, 0]} maxBarSize={26} />
                            <Line type="monotone" dataKey="balance" name="Balance Casa" stroke="#2cd9a2" strokeWidth={3} dot={{ r: 4 }} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      ) : <Empty />}
                    </div>
                  </Card>

                  <Card title="Detalle Completo de reporte_top_equipos" description="Tabla generada directamente por el job de Apache Spark">
                    <div className="table-scroll">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Equipo</th>
                            <th>País</th>
                            <th>Liga</th>
                            <th>Apuestas</th>
                            <th>Volumen (COP)</th>
                            <th>Pagado (COP)</th>
                            <th>Balance Casa</th>
                            <th>Cuota Prom.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.topTeams.map((r, i) => (
                            <tr key={i}>
                              <td><strong>{r.name}</strong></td>
                              <td>{r.pais || '—'}</td>
                              <td>{r.liga || '—'}</td>
                              <td>{nf.format(r.apuestas)}</td>
                              <td>{dec.format(r.volumen)}</td>
                              <td>{dec.format(r.pagado)}</td>
                              <td>{dec.format(r.balance)}</td>
                              <td>{dec.format(r.cuota)}×</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {data.topTeams.length === 0 && <Empty />}
                    </div>
                  </Card>
                </>
              )}

              {page === 'ligas' && (
                <>
                  <div className="metrics-grid three">
                    <Metric name="Ligas Analizadas" value={nf.format(t.ligas)} caption="Registros en reporte_ligas" icon={Trophy} gradient="blue" />
                    <Metric name="Promedio de Goles" value={dec.format(t.golesPromedio)} caption="Goles por partido en ligas" icon={Activity} gradient="teal" />
                    <Metric name="Prob. Implícita Local" value={`${dec.format(t.probLocalMedia)}%`} caption="Calculada desde cuotas locales" icon={TrendingUp} gradient="indigo" />
                  </div>

                  <Card title="Comparativa de Cuotas Local vs. Visitante por Liga" description="reportes_db.reporte_ligas · análisis estadístico de Spark">
                    <div className="graph-area">
                      {data.leagues.length ? (
                        <ResponsiveContainer width="100%" height={280}>
                          <BarChart data={data.leagues} margin={{ top: 14, right: 12, left: -16, bottom: 0 }}>
                            <CartesianGrid stroke="#263247" strokeDasharray="3 6" vertical={false} />
                            <XAxis dataKey="liga" tick={{ fill: '#bac7da', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#8c9ab2', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<GraphTooltip />} />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Bar dataKey="cuotaLocal" name="Cuota Local Prom." fill="#2cd9a2" radius={[4, 4, 0, 0]} maxBarSize={24} />
                            <Bar dataKey="cuotaVisitante" name="Cuota Visitante Prom." fill="#f39a65" radius={[4, 4, 0, 0]} maxBarSize={24} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : <Empty />}
                    </div>
                  </Card>

                  <Card title="Tabla Analítica de Ligas (reporte_ligas)" description="Indicadores consolidados por país y competición">
                    <div className="table-scroll">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>País</th>
                            <th>Liga</th>
                            <th>Total Partidos</th>
                            <th>Prom. Goles</th>
                            <th>Cuota Local</th>
                            <th>Cuota Visitante</th>
                            <th>Prob. Local</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.leagues.map((l, i) => (
                            <tr key={i}>
                              <td>{l.pais || '—'}</td>
                              <td><strong>{l.liga}</strong></td>
                              <td>{nf.format(l.partidos)}</td>
                              <td>{dec.format(l.goles)}</td>
                              <td>{dec.format(l.cuotaLocal)}×</td>
                              <td>{dec.format(l.cuotaVisitante)}×</td>
                              <td>{dec.format(l.probLocal)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {data.leagues.length === 0 && <Empty />}
                    </div>
                  </Card>
                </>
              )}

              {page === 'infraestructura' && (
                <>
                  <div className="infra-banner">
                    <div>
                      <span className="eyebrow">PIPELINE BIG DATA · APACHE SPARK</span>
                      <h2>Procesamiento analítico desacoplado</h2>
                      <p>Apache Spark (servidorUbuntu1) lee y limpia las 5 bases transaccionales de MySQL (192.168.100.5), ejecuta agregaciones distribuidas y publica las tablas finales en reportes_db para este dashboard.</p>
                    </div>
                    <GitBranch size={58} />
                  </div>

                  <div className="infra-grid">
                    {[
                      { name: 'reporte_top_equipos', icon: Trophy, detail: 'Ranking, volumen y balance', count: data.topTeams.length, unit: 'equipos top' },
                      { name: 'reporte_ligas', icon: BarChart3, detail: 'Goles y probabilidades', count: t.ligas, unit: 'ligas' },
                      { name: 'reporte_tendencias', icon: TrendingUp, detail: 'Desenlaces y cuotas medias', count: t.partidosTendencias, unit: 'partidos' },
                    ].map(s => (
                      <div className="infra-card" key={s.name}>
                        <div className="infra-card-head"><s.icon size={19} /><span className="status-live"><span className="live-dot" /> Spark SQL</span></div>
                        <h3>{s.name}</h3>
                        <p>{s.detail}</p>
                        <strong>{nf.format(s.count)} <small>{s.unit}</small></strong>
                      </div>
                    ))}
                  </div>

                  <Card title="Flujo de Datos del Clúster" description="Arquitectura distribuida en 3 nodos VirtualBox">
                    <div className="architecture">
                      <div><Database size={20} /><strong>MySQL (5 DBs)</strong><small>servidorUbuntu2 (.5)</small></div>
                      <ArrowRight size={17} />
                      <div><Sparkles size={20} /><strong>Apache Spark</strong><small>servidorUbuntu1 (.4)</small></div>
                      <ArrowRight size={17} />
                      <div><Server size={20} /><strong>reportes_db</strong><small>Tablas agregadas</small></div>
                      <ArrowRight size={17} />
                      <div><LayoutDashboard size={20} /><strong>Dashboard Swarm</strong><small>servidorUbuntu (.3)</small></div>
                    </div>
                  </Card>
                  <SparkBanner />
                </>
              )}
            </div>
          )}

          <footer className="footer">
            <span>© 2026 NOVATIX · Analítica Distribuida con Apache Spark</span>
            <span>{data?.updatedAt ? `Consulta Spark: ${new Date(data.updatedAt).toLocaleString('es-CO')}` : 'Conectando con reportes_db…'} · v2.0 Spark</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default App;
