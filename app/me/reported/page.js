'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CATEGORY_MAP } from '@/lib/categories';
import { Flag, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const REASON_LABEL = {
  spam: 'Spam',
  fake: 'Fake / hoax',
  inappropriate: 'Inappropriate',
  duplicate: 'Duplicate',
  other: 'Other',
};

export default function ReportedPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const router = useRouter();

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    (async () => {
      const r = await fetch('/api/me/reports');
      if (r.status === 401) { router.push('/login'); return; }
      const j = await r.json();
      setReports(j.reports || []);
      setLoading(false);
    })();
  }, [router]);

  if (!mounted || loading) return <div className="min-h-[100dvh] grid place-items-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="border-b border-border bg-card/70 backdrop-blur sticky top-0 z-20">
        <div className="container max-w-2xl flex items-center gap-3 py-3">
          <Link href="/me" className="h-9 w-9 rounded-xl bg-muted grid place-items-center"><ArrowLeft className="h-4 w-4" /></Link>
          <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground grid place-items-center"><Flag className="h-5 w-5" /></div>
          <div className="font-bold">Reported Jobs ({reports.length})</div>
        </div>
      </header>

      <div className="container max-w-2xl py-6 grid gap-3">
        {reports.length === 0 && (
          <Card><CardContent className="p-8 text-center">
            <Flag className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <div className="font-semibold">No reports filed</div>
            <div className="text-sm text-muted-foreground mt-1">If you spot a fake or spam job, use the flag icon on its detail card.</div>
            <Link href="/" className="inline-block mt-4"><Button variant="outline">Back to map</Button></Link>
          </CardContent></Card>
        )}
        {reports.map((r) => {
          const j = r.vacancies;
          const cat = j ? (CATEGORY_MAP[j.category] || CATEGORY_MAP.other) : CATEGORY_MAP.other;
          return (
            <Card key={r.id}>
              <CardContent className="p-3 flex gap-3">
                {j?.poster_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={j.poster_url} alt="" className="h-20 w-20 rounded-xl object-cover bg-muted shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-semibold truncate">{j?.title || 'Job removed'}</div>
                    {j && <span className="text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: cat.color }}>{cat.label}</span>}
                    <StatusBadge status={j?.status} />
                  </div>
                  {j?.business_name && <div className="text-sm text-muted-foreground truncate">{j.business_name}</div>}
                  <div className="text-xs mt-1">Reason: <b>{REASON_LABEL[r.reason] || r.reason}</b>{r.notes ? ` — ${r.notes}` : ''}</div>
                  <div className="text-[11px] text-muted-foreground">Reported {new Date(r.created_at).toLocaleDateString()}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  if (!status) return null;
  const map = {
    active: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-rose-100 text-rose-800',
    expired: 'bg-gray-100 text-gray-700',
    pending: 'bg-amber-100 text-amber-800',
  };
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${map[status] || 'bg-muted'}`}>{status}</span>;
}
