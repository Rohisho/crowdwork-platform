'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CATEGORY_MAP } from '@/lib/categories';
import { toast } from 'sonner';
import { Bookmark, ArrowLeft, MapPin, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SavedPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const router = useRouter();

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    (async () => {
      const r = await fetch('/api/me/bookmarks');
      if (r.status === 401) { router.push('/login'); return; }
      const j = await r.json();
      setJobs(j.jobs || []);
      setLoading(false);
    })();
  }, [router]);

  async function remove(id) {
    const r = await fetch(`/api/jobs/${id}/bookmark`, { method: 'DELETE' });
    if (r.ok) { setJobs((prev) => prev.filter((j) => j.id !== id)); toast('Removed from saved'); }
    else toast.error('Failed');
  }

  if (!mounted || loading) return <div className="min-h-[100dvh] grid place-items-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="border-b border-border bg-card/70 backdrop-blur sticky top-0 z-20">
        <div className="container max-w-2xl flex items-center gap-3 py-3">
          <Link href="/me" className="h-9 w-9 rounded-xl bg-muted grid place-items-center"><ArrowLeft className="h-4 w-4" /></Link>
          <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground grid place-items-center"><Bookmark className="h-5 w-5" /></div>
          <div className="font-bold">Saved Jobs ({jobs.length})</div>
        </div>
      </header>

      <div className="container max-w-2xl py-6 grid gap-3">
        {jobs.length === 0 && (
          <Card><CardContent className="p-8 text-center">
            <Bookmark className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <div className="font-semibold">Nothing saved yet</div>
            <div className="text-sm text-muted-foreground mt-1">Tap the bookmark icon on any job to save it here.</div>
            <Link href="/" className="inline-block mt-4"><Button variant="outline">Browse jobs</Button></Link>
          </CardContent></Card>
        )}
        {jobs.map((j) => {
          const cat = CATEGORY_MAP[j.category] || CATEGORY_MAP.other;
          return (
            <Card key={j.id}>
              <CardContent className="p-3 flex gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={j.poster_url} alt="" className="h-20 w-20 rounded-xl object-cover bg-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold truncate">{j.title}</div>
                    <span className="text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: cat.color }}>{cat.label}</span>
                  </div>
                  {j.business_name && <div className="text-sm text-muted-foreground truncate">{j.business_name}</div>}
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="h-3 w-3" />{j.postcode || j.town || `${j.lat?.toFixed(3)}, ${j.lng?.toFixed(3)}`}</div>
                  <div className="text-[11px] text-muted-foreground">Saved {new Date(j.bookmarked_at).toLocaleDateString()}</div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => remove(j.id)} className="self-start text-muted-foreground">Remove</Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
