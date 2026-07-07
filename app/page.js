'use client';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { Camera, MapPin, List, Map as MapIcon, LogIn, User as UserIcon, Bookmark, Loader2, Search, X, Shield, Flag, LogOut, ChevronDown } from 'lucide-react';
import { CATEGORIES, CATEGORY_MAP } from '@/lib/categories';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import { toast } from 'sonner';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const MapView = dynamic(() => import('@/components/map-view'), { ssr: false });
const UploadSheet = dynamic(() => import('@/components/upload-sheet'), { ssr: false });
const JobDetailSheet = dynamic(() => import('@/components/job-detail-sheet'), { ssr: false });

const DEFAULT_CENTER = [-0.1276, 51.5074]; // London

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [hasGeo, setHasGeo] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('map'); // 'map' | 'list'
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { setMounted(true); }, []);

  // Auth + OAuth code exchange fallback
  // If Google/Supabase redirects back to "/" with ?code=... (misconfigured Site URL),
  // we still handle it here so the session gets created and the profile is generated.
  useEffect(() => {
    const supa = getSupabaseBrowser();
    (async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        if (code) {
          const { error } = await supa.auth.exchangeCodeForSession(code);
          if (!error) {
            toast.success('Signed in!');
          }
          // Clean the URL so the code isn't left in history / re-triggered on refresh
          url.searchParams.delete('code');
          url.searchParams.delete('state');
          window.history.replaceState({}, '', url.pathname + (url.search || '') + url.hash);
        }
      } catch {}
      const { data } = await supa.auth.getUser();
      setUser(data.user ?? null);
    })();
    const { data: sub } = supa.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Fetch admin status when user changes
  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    fetch('/api/me').then((r) => r.json()).then((j) => setIsAdmin(j.profile?.role === 'admin')).catch(() => {});
  }, [user]);

  // Geolocation
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCenter([pos.coords.longitude, pos.coords.latitude]); setHasGeo(true); },
      () => setHasGeo(false),
      { enableHighAccuracy: true, timeout: 6000 }
    );
  }, []);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('lat', String(center[1]));
      params.set('lng', String(center[0]));
      params.set('radius_m', '500000'); // 500km — covers all of UK from any point
      if (categoryFilter) params.set('category', categoryFilter);
      const res = await fetch('/api/jobs?' + params.toString());
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch (e) {
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [center, categoryFilter]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  // Realtime: new job inserts
  useEffect(() => {
    const supa = getSupabaseBrowser();
    const ch = supa
      .channel('vacancies-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vacancies' }, (payload) => {
        const j = payload.new;
        setJobs((prev) => (prev.some(p => p.id === j.id) ? prev : [j, ...prev]));
        toast('✨ New job just spotted nearby!', { description: j.title });
      })
      .subscribe();
    return () => { supa.removeChannel(ch); };
  }, []);

  const filtered = useMemo(() => {
    let list = categoryFilter ? jobs.filter((j) => j.category === categoryFilter) : jobs;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((j) => {
        const cat = CATEGORY_MAP[j.category]?.label?.toLowerCase() || '';
        return (
          (j.title || '').toLowerCase().includes(q) ||
          (j.business_name || '').toLowerCase().includes(q) ||
          (j.description || '').toLowerCase().includes(q) ||
          (j.postcode || '').toLowerCase().includes(q) ||
          (j.town || '').toLowerCase().includes(q) ||
          (j.category || '').toLowerCase().includes(q) ||
          cat.includes(q)
        );
      });
    }
    return list;
  }, [jobs, categoryFilter, searchQuery]);

  if (!mounted) {
    return (
      <div className="h-[100dvh] grid place-items-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm">Loading Spotted Jobs…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-background overflow-hidden">
      {/* Top bar */}
      <header className="px-4 py-3 flex items-center gap-3 border-b border-border bg-background/80 backdrop-blur-md z-30">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground grid place-items-center shadow-sm">
            <MapPin className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="font-bold text-[15px]">Spotted Jobs</div>
            <div className="text-[11px] text-muted-foreground">Hyperlocal hiring, by real people</div>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden sm:flex rounded-full border border-border p-1 bg-card">
            <button onClick={() => setView('map')} className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 transition ${view === 'map' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}><MapIcon className="h-4 w-4" />Map</button>
            <button onClick={() => setView('list')} className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 transition ${view === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}><List className="h-4 w-4" />List</button>
          </div>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <UserIcon className="h-4 w-4" />
                  <span className="hidden xs:inline">{(user.user_metadata?.full_name || user.email || 'You').split(' ')[0]}</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold truncate">{user.user_metadata?.full_name || user.email?.split('@')[0]}</span>
                  <span className="text-[11px] font-normal text-muted-foreground truncate">{user.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/me" className="gap-2 cursor-pointer"><UserIcon className="h-4 w-4" />Profile details</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/me/saved" className="gap-2 cursor-pointer"><Bookmark className="h-4 w-4" />Saved jobs</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/me/reported" className="gap-2 cursor-pointer"><Flag className="h-4 w-4" />Reported jobs</Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="gap-2 cursor-pointer"><Shield className="h-4 w-4" />Admin dashboard</Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive gap-2 cursor-pointer"
                  onClick={async () => {
                    const s = getSupabaseBrowser();
                    await s.auth.signOut();
                    toast('Signed out');
                  }}
                >
                  <LogOut className="h-4 w-4" />Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login"><Button size="sm" className="gap-1"><LogIn className="h-4 w-4" />Sign in</Button></Link>
          )}
        </div>
      </header>

      {/* Search bar */}
      <div className="px-3 pt-3 pb-2 bg-background/60 border-b border-border">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by place, postcode, or category…"
            className="pl-9 pr-9 h-11 rounded-full bg-card border-border focus-visible:ring-primary"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-muted grid place-items-center text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Category chips */}
      <div className="px-3 py-2 flex gap-2 overflow-x-auto scroll-hide border-b border-border bg-background/60">
        <button
          onClick={() => setCategoryFilter(null)}
          className={`shrink-0 px-3 h-9 rounded-full text-sm border transition ${!categoryFilter ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border'}`}
        >All</button>
        {CATEGORIES.map((c) => (
          <button
            key={c.slug}
            onClick={() => setCategoryFilter(c.slug === categoryFilter ? null : c.slug)}
            className={`shrink-0 px-3 h-9 rounded-full text-sm border transition flex items-center gap-1.5 ${categoryFilter === c.slug ? 'text-white border-transparent' : 'bg-card border-border'}`}
            style={categoryFilter === c.slug ? { backgroundColor: c.color } : {}}
          >
            <span>{c.emoji}</span>{c.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <main className="relative flex-1 min-h-0">
        <AnimatePresence mode="wait">
          {view === 'map' ? (
            <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
              <MapView center={center} jobs={filtered} onSelect={setSelectedJob} />
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute inset-0 overflow-y-auto">
              <JobList jobs={filtered} loading={loading} onSelect={setSelectedJob} />
            </motion.div>
          )}
        </AnimatePresence>

        {loading && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-card border border-border rounded-full px-3 py-1.5 text-xs flex items-center gap-2 shadow-sm">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading jobs…
          </div>
        )}

        {/* Mobile view toggle */}
        <div className="sm:hidden absolute top-3 right-3 z-20 rounded-full border border-border p-1 bg-card shadow-sm">
          <button onClick={() => setView(view === 'map' ? 'list' : 'map')} className="px-3 py-1.5 rounded-full text-xs flex items-center gap-1">
            {view === 'map' ? <><List className="h-3.5 w-3.5" />List</> : <><MapIcon className="h-3.5 w-3.5" />Map</>}
          </button>
        </div>

        {/* Floating action button */}
        <button
          onClick={() => {
            if (!user) { toast('Sign in first to contribute a job'); return; }
            setUploadOpen(true);
          }}
          className="absolute bottom-6 right-6 z-20 h-16 w-16 rounded-full bg-primary text-primary-foreground shadow-xl grid place-items-center hover:scale-105 transition"
          aria-label="Spot a job"
        >
          <Camera className="h-7 w-7" />
        </button>

        {/* Count badge */}
        <div className="absolute bottom-6 left-6 z-20">
          <Badge className="bg-card text-foreground border border-border shadow-sm">
            {filtered.length} job{filtered.length === 1 ? '' : 's'} spotted
          </Badge>
        </div>
      </main>

      {uploadOpen && (
        <UploadSheet
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          onCreated={(job) => {
            setJobs((prev) => (prev.some(p => p.id === job.id) ? prev : [job, ...prev]));
            setSelectedJob(job);
            setUploadOpen(false);
          }}
        />
      )}

      {selectedJob && (
        <JobDetailSheet job={selectedJob} onClose={() => setSelectedJob(null)} user={user} />
      )}
    </div>
  );
}

function JobList({ jobs, loading, onSelect }) {
  if (!loading && jobs.length === 0) {
    return (
      <div className="h-full grid place-items-center p-8 text-center">
        <div>
          <div className="text-5xl mb-3">🔍</div>
          <div className="font-semibold">No jobs spotted nearby yet</div>
          <div className="text-sm text-muted-foreground mt-1">Be the first! Snap a hiring poster you see in a shop window.</div>
        </div>
      </div>
    );
  }
  return (
    <div className="p-3 grid gap-3 pb-24">
      {jobs.map((j) => (
        <button key={j.id} onClick={() => onSelect(j)} className="text-left bg-card border border-border rounded-2xl p-3 flex gap-3 hover:shadow-md transition">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={j.poster_url} alt="" className="h-20 w-20 object-cover rounded-xl bg-muted shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="font-semibold truncate">{j.title}</div>
              <CategoryPill slug={j.category} />
            </div>
            {j.business_name && <div className="text-sm text-muted-foreground truncate">{j.business_name}</div>}
            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{j.description}</div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {typeof j.distance_m === 'number' ? `${(j.distance_m/1000).toFixed(1)} km • ` : ''}
              {new Date(j.created_at).toLocaleDateString()}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function CategoryPill({ slug }) {
  const c = CATEGORY_MAP[slug] || CATEGORY_MAP.other;
  return (
    <span className="text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: c.color }}>
      {c.label}
    </span>
  );
}
