"use client"

import { useState, useEffect, useRef } from 'react';
import { Storage, CustodyRecord } from '@/lib/storage';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Search, UserCheck, Undo2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export default function CustodyManagement() {
  const [records, setRecords] = useState<CustodyRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'active' | 'history'>('active');

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<CustodyRecord | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const isRevokingRef = useRef(false);

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      const recs = await Storage.getCustodyRecords();
      setRecords(recs.reverse());
    } catch {
      toast({ variant: "destructive", title: "Ralat", description: "Gagal memuatkan rekod hak jagaan." });
    }
  };

  const handleRevoke = async () => {
    if (isRevokingRef.current || !revokeTarget || !user) return;
    isRevokingRef.current = true;
    setRevokingId(revokeTarget.custodyId);
    try {
      const today = new Date().toISOString().split('T')[0];

      const currentRecords = await Storage.getCustodyRecords();
      await Storage.saveCustodyRecords(currentRecords.map(r =>
        r.custodyId === revokeTarget.custodyId
          ? { ...r, status: 'revoked' as const, revokedBy: user.name, revokedDate: today }
          : r
      ));

      const currentUnits = await Storage.getUnits();
      await Storage.saveUnits(currentUnits.map(u =>
        u.unitId === revokeTarget.unitId && u.currentStatus === 'assigned'
          ? { ...u, currentStatus: 'available' as const, currentBorrowerId: '', currentBorrowerName: '', currentRequestId: '', assignedDate: '' }
          : u
      ));

      const currentAssets = await Storage.getAssets();
      await Storage.saveAssets(currentAssets.map(a =>
        a.assetId === revokeTarget.assetId
          ? { ...a, availableQty: (a.availableQty || 0) + 1 }
          : a
      ));

      toast({ title: "Hak Jagaan Ditarik Balik", description: `Unit ${revokeTarget.assetTag} telah dikembalikan ke stok tersedia.` });
      await loadRecords();
    } catch {
      toast({ variant: "destructive", title: "Ralat", description: "Gagal menarik balik hak jagaan." });
    } finally {
      isRevokingRef.current = false;
      setRevokingId(null);
      setConfirmOpen(false);
      setRevokeTarget(null);
    }
  };

  const filteredRecords = records.filter(r => {
    const matchesView = view === 'active' ? r.status === 'active' : r.status === 'revoked';
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (r.userName || '').toLowerCase().includes(term) ||
      (r.assetTag || '').toLowerCase().includes(term) ||
      (r.assetName || '').toLowerCase().includes(term);
    return matchesView && matchesSearch;
  });

  const activeCount = records.filter(r => r.status === 'active').length;
  const historyCount = records.filter(r => r.status === 'revoked').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-primary">Hak Jagaan Aset</h1>
          <p className="text-sm text-muted-foreground">Urus aset master yang diserahkan kepada staf sebagai hak jagaan.</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant={view === 'active' ? 'default' : 'outline'}
          size="sm"
          className={view === 'active' ? 'bg-purple-600 hover:bg-purple-700' : ''}
          onClick={() => setView('active')}
        >
          Aktif ({activeCount})
        </Button>
        <Button
          variant={view === 'history' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('history')}
        >
          Sejarah ({historyCount})
        </Button>
      </div>

      <Card className="shadow-md">
        <CardHeader className="pb-3">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama staf, tag atau nama aset..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Aset</TableHead>
                <TableHead>Staf</TableHead>
                <TableHead className="hidden md:table-cell">Tarikh Diberi</TableHead>
                <TableHead className="hidden lg:table-cell">Lokasi</TableHead>
                <TableHead className="hidden md:table-cell">Diserah Oleh</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Tindakan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-40 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <UserCheck className="h-10 w-10 mb-2 opacity-20" />
                      <p>{view === 'active' ? 'Tiada hak jagaan aktif.' : 'Tiada sejarah hak jagaan.'}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((rec) => (
                  <TableRow key={rec.custodyId}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-xs md:text-sm">{rec.assetName}</span>
                        <code className="text-[10px] text-muted-foreground font-mono">{rec.assetTag}</code>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-xs md:text-sm">{rec.userName}</span>
                        <span className="text-[10px] text-muted-foreground">{rec.userDept}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs">{rec.assignedDate}</TableCell>
                    <TableCell className="hidden lg:table-cell text-xs">{rec.location || <span className="text-muted-foreground italic">—</span>}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs">{rec.assignedBy}</TableCell>
                    <TableCell>
                      {rec.status === 'active' ? (
                        <Badge className="bg-purple-600">Aktif</Badge>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <Badge variant="secondary" className="w-fit">Ditarik Balik</Badge>
                          <span className="text-[10px] text-muted-foreground">{rec.revokedDate} oleh {rec.revokedBy}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {rec.status === 'active' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-[10px] md:text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                          disabled={revokingId === rec.custodyId}
                          onClick={() => { setRevokeTarget(rec); setConfirmOpen(true); }}
                        >
                          {revokingId === rec.custodyId ? <Loader2 className="h-3 w-3 animate-spin" /> : <Undo2 className="h-3 w-3" />}
                          {revokingId === rec.custodyId ? 'Memproses...' : 'Tarik Balik'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Tarik Balik Hak Jagaan?"
        description={`Unit ${revokeTarget?.assetTag} akan dikembalikan ke stok tersedia. Rekod sejarah akan dikekalkan.`}
        onConfirm={handleRevoke}
      />
    </div>
  );
}
