'use client';
import { useEffect, useState, useCallback } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import Link from 'next/link';
import { CATEGORY_MAP } from '@/lib/categories';
import { ArrowLeft, Shield, CheckCircle2, XCircle, Trash2, Users, Flag, Sparkles, LayoutDashboard, RefreshCw, Loader2, MapPin, Database } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminPage() {
  const [phase, setPhase] = useState('loading'); // loading | need_login | need_claim | ready | forbidden
  const [me, setMe] = useState(null);
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const supa = getSupabaseBrowser();
      const { data: { user } } = await supa.auth.getUser();
      setMe(user);
      if (!user) { setPhase('need_login'); return; }

      const overview = await fetch('/api/admin/overview');
      if (overview.status === 403) {
        // Not admin — check bootstrap possibility
        const claimInfo = await fetch('/api/admin/claim').then((r) => r.json());
        setPhase(claimInfo.hasAdmin ? 'forbidden' : 'need_claim');
        return;
      }
      if (!overview.ok) { setPhase('forbidden'); return; }
      const j = await overview.json();
      setData(j);
      setPhase('ready');
    } finally { setBusy(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function claim() {
    const r = await fetch('/api/admin/claim', { method: 'POST' });
    const j = await r.json();
    if (!r.ok) { toast.error(j.error || 'Failed'); return; }
    toast.success('You are now the admin!');
    load();
  }

  async function updateJob(id, patch) {
    const r = await fetch(`/api/admin/jobs/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
    const j = await r.json();
    if (!r.ok) { toast.error(j.error); return; }
    toast.success('Updated'); load();
  }
  async function deleteJob(id) {
    if (!confirm('Delete this job permanently?')) return;
    const r = await fetch(`/api/admin/jobs/${id}`, { method: 'DELETE' });
    if (!r.ok) { toast.error('Failed'); return; }
    toast.success('Deleted'); load();
  }
  async function toggleUser(u) {
    const nextRole = u.role === 'admin' ? 'user' : 'admin';
    const r = await fetch(`/api/admin/users/${u.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: nextRole }) });
    const j = await r.json();
    if (!r.ok) { toast.error(j.error); return; }
    toast.success(`Now ${nextRole}`); load();
  }

  async function deleteUser(u) {
    if (!confirm(`Remove ${u.email || u.display_name} and all their content permanently?`)) return;
    const r = await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' });
    const j = await r.json();
    if (!r.ok) { toast.error(j.error); return; }
    toast.success('User removed'); load();
  }

  async function seed() {
    setBusy(true);
    try {
      const r = await fetch('/api/admin/seed', { method: 'POST' });
      const j = await r.json();
      if (!r.ok) { toast.error(j.error); return; }
      toast.success(j.seeded ? `Seeded ${j.seeded} demo jobs` : (j.message || 'Already seeded'));
      load();
    } finally { setBusy(false); }
  }
  async function unseed() {
    setBusy(true);
    try {
      const r = await fetch('/api/admin/seed', { method: 'DELETE' });
      const j = await r.json();
      if (!r.ok) { toast.error(j.error); return; }
      toast.success(`Removed ${j.removed} demo jobs`);
      load();
    } finally { setBusy(false); }
  }

  if (phase === 'loading') return (
    <div className="min-h-screen grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
  );

  if (phase === 'need_login') return (
    <Gate title="Sign in required" body="You need to sign in first to access the admin dashboard." cta={<Link href="/login"><Button>Sign in</Button></Link>} />
  );

  if (phase === 'forbidden') return (
    <Gate title="Admin only" body="This area is restricted. Ask an existing admin to promote your account." cta={<Link href="/"><Button variant="outline">← Back to map</Button></Link>} />
  );

  if (phase === 'need_claim') return (
    <Gate
      title="Claim admin"
      body="No admin exists yet. Since you’re the first to open this page while signed in, you can promote yourself to admin now."
      cta={<Button onClick={claim} className="gap-2"><Shield className="h-4 w-4" />Promote me to admin</Button>}
    />
  );

  const stats = data.stats;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-20">
        <div className="container flex items-center gap-3 py-3">
          <Link href="/" className="h-9 w-9 rounded-xl bg-muted grid place-items-center"><ArrowLeft className="h-4 w-4" /></Link>
          <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground grid place-items-center"><Shield className="h-5 w-5" /></div>
          <div>
            <div className="font-bold">Admin Dashboard</div>
            <div className="text-xs text-muted-foreground">Spotted Jobs — signed in as {me?.email}</div>
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={busy}><RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} /></Button>
          </div>
        </div>
      </header>

      <div className="container py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <StatCard label="Total jobs" value={stats.total} accent />
          <StatCard label="Active" value={stats.active} />
          <StatCard label="Expired" value={stats.expired} />
          <StatCard label="Rejected" value={stats.rejected} />
          <StatCard label="Reports" value={stats.reports} />
          <StatCard label="Users" value={stats.users} />
        </div>

        {/* Demo seed CTA */}
        <Card>
          <CardContent className="p-4 flex flex-wrap items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center"><Sparkles className="h-5 w-5" /></div>
            <div className="flex-1 min-w-[220px]">
              <div className="font-semibold">Demo showcase data</div>
              <div className="text-sm text-muted-foreground">Seed 8 realistic London hiring posters so new visitors see a lively map.</div>
            </div>
            <Button onClick={seed} disabled={busy} className="gap-2"><Database className="h-4 w-4" />Seed demo jobs</Button>
            <Button onClick={unseed} disabled={busy} variant="outline" className="gap-2"><Trash2 className="h-4 w-4" />Remove demo</Button>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="jobs">
          <TabsList>
            <TabsTrigger value="jobs" className="gap-1"><LayoutDashboard className="h-4 w-4" />Moderation Queue</TabsTrigger>
            <TabsTrigger value="users" className="gap-1"><Users className="h-4 w-4" />Users</TabsTrigger>
            <TabsTrigger value="reports" className="gap-1"><Flag className="h-4 w-4" />Reports</TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1"><Sparkles className="h-4 w-4" />Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="jobs">
            <JobsTable jobs={data.jobs} onApprove={(id) => updateJob(id, { status: 'active' })} onReject={(id) => updateJob(id, { status: 'rejected' })} onDelete={deleteJob} />
          </TabsContent>
          <TabsContent value="users">
            <UsersTable users={data.users} me={me} onToggle={toggleUser} onDelete={deleteUser} />
          </TabsContent>
          <TabsContent value="reports">
            <ReportsTable reports={data.reports} />
          </TabsContent>
          <TabsContent value="analytics">
            <Analytics stats={stats} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function Gate({ title, body, cta }) {
  return (
    <div className="min-h-screen grid place-items-center p-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-md text-center bg-card border rounded-3xl p-8 shadow-sm">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary grid place-items-center mx-auto mb-3"><Shield className="h-7 w-7" /></div>
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground mt-2">{body}</p>
        <div className="mt-6">{cta}</div>
      </motion.div>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <Card className={accent ? 'bg-primary text-primary-foreground border-primary' : ''}>
      <CardContent className="p-4">
        <div className={`text-xs uppercase tracking-wider ${accent ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{label}</div>
        <div className="text-2xl font-bold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

function JobsTable({ jobs, onApprove, onReject, onDelete }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const filtered = jobs.filter((j) => {
    if (status !== 'all' && j.status !== status) return false;
    if (!q.trim()) return true;
    const term = q.toLowerCase();
    return (j.title || '').toLowerCase().includes(term) || (j.business_name || '').toLowerCase().includes(term) || (j.postcode || '').toLowerCase().includes(term);
  });
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3">
        <CardTitle className="text-base">Moderation Queue ({filtered.length})</CardTitle>
        <div className="ml-auto flex gap-2 items-center">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-2 text-sm">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="expired">Expired</option>
            <option value="rejected">Rejected</option>
          </select>
          <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 w-56" />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid divide-y">
          {filtered.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No jobs match</div>}
          {filtered.map((j) => {
            const cat = CATEGORY_MAP[j.category] || CATEGORY_MAP.other;
            return (
              <div key={j.id} className="p-3 flex gap-3 items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={j.poster_url} alt="" className="h-16 w-16 object-cover rounded-lg bg-muted shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold truncate">{j.title}</div>
                    <span className="text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: cat.color }}>{cat.label}</span>
                    <StatusPill status={j.status} />
                    {j.ai_confidence != null && <Badge variant="outline" className="text-[10px]">AI {Math.round(j.ai_confidence * 100)}%</Badge>}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">{j.business_name} • {j.postcode || j.town}</div>
                  <div className="text-[11px] text-muted-foreground">Spotted {new Date(j.created_at).toLocaleString()} • 👍 {j.active_votes} / 👎 {j.gone_votes} • 🚩 {j.report_count}</div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {j.status !== 'active' && <Button size="sm" variant="outline" onClick={() => onApprove(j.id)} className="gap-1"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Approve</Button>}
                  {j.status !== 'rejected' && <Button size="sm" variant="outline" onClick={() => onReject(j.id)} className="gap-1"><XCircle className="h-4 w-4 text-amber-600" />Reject</Button>}
                  <Button size="sm" variant="ghost" onClick={() => onDelete(j.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusPill({ status }) {
  const map = {
    active: { bg: 'bg-emerald-100 text-emerald-800', label: 'Active' },
    pending: { bg: 'bg-amber-100 text-amber-800', label: 'Pending' },
    rejected: { bg: 'bg-rose-100 text-rose-800', label: 'Rejected' },
    expired: { bg: 'bg-gray-100 text-gray-700', label: 'Expired' },
  };
  const m = map[status] || map.pending;
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${m.bg}`}>{m.label}</span>;
}

function UsersTable({ users, me, onToggle, onDelete }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Users ({users.length})</CardTitle></CardHeader>
      <CardContent className="p-0">
        <div className="grid divide-y">
          {users.map((u) => (
            <div key={u.id} className="p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted grid place-items-center overflow-hidden shrink-0">
                {u.avatar_url ? <img src={u.avatar_url} alt="" className="h-full w-full object-cover" /> : <Users className="h-4 w-4 opacity-50" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate">{u.display_name || u.id.slice(0, 8)}</span>
                  {u.email && <span className="text-xs text-muted-foreground truncate">{u.email}</span>}
                  {u.providers?.map((p) => (
                    <Badge key={p} variant="outline" className="text-[10px] capitalize">{p}</Badge>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground">
                  Trust {u.trust_score} • {u.contribution_count} contributions • joined {new Date(u.created_at).toLocaleDateString()}
                  {u.last_sign_in_at && <> • last seen {new Date(u.last_sign_in_at).toLocaleDateString()}</>}
                </div>
              </div>
              <Badge variant={u.role === 'admin' ? 'default' : 'outline'} className={u.role === 'admin' ? 'bg-primary' : ''}>{u.role}</Badge>
              <Button size="sm" variant="outline" disabled={u.id === me?.id} onClick={() => onToggle(u)}>
                {u.role === 'admin' ? 'Demote' : 'Promote'}
              </Button>
              <Button size="sm" variant="ghost" className="text-destructive" disabled={u.id === me?.id} onClick={() => onDelete(u)} title="Delete user">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ReportsTable({ reports }) {
  if (reports.length === 0) return (
    <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No reports yet. Nice 🙌</CardContent></Card>
  );
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Reports ({reports.length})</CardTitle></CardHeader>
      <CardContent className="p-0">
        <div className="grid divide-y">
          {reports.map((r) => (
            <div key={r.id} className="p-3 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {r.vacancies?.poster_url && <img src={r.vacancies.poster_url} alt="" className="h-14 w-14 rounded-lg object-cover shrink-0 bg-muted" />}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{r.vacancies?.title || 'Unknown job'}</div>
                <div className="text-xs text-muted-foreground">Reason: <b>{r.reason}</b> {r.notes && `— ${r.notes}`}</div>
                <div className="text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
              </div>
              <Link href={`/`} className="text-xs text-primary">view on map</Link>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Analytics({ stats }) {
  const entries = Object.entries(stats.byCategory);
  const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Category breakdown (active jobs)</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {entries.length === 0 && <div className="text-sm text-muted-foreground">No active jobs yet</div>}
        {entries.map(([slug, count]) => {
          const cat = CATEGORY_MAP[slug] || CATEGORY_MAP.other;
          const pct = (count / total) * 100;
          return (
            <div key={slug}>
              <div className="flex justify-between text-sm mb-1">
                <span className="flex items-center gap-1">{cat.emoji} {cat.label}</span>
                <span className="text-muted-foreground">{count} • {pct.toFixed(0)}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full" style={{ width: `${pct}%`, backgroundColor: cat.color }} />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
