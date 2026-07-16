"use client"

import { useState, useEffect, useRef } from 'react';
import { Storage, BorrowRequest, CustodyRecord } from '@/lib/storage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { useAuth } from '@/hooks/use-auth';
import { ClipboardList, AlertCircle, CheckCircle2, Clock, XCircle, RefreshCw, CalendarClock, ChevronDown, ChevronUp, Printer, Loader2, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { printBorangKEWPA9 } from '@/lib/print-borang';
import React from 'react';

export default function MyRequests() {
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [myCustody, setMyCustody] = useState<CustodyRecord[]>([]);
  const [expandedReqs, setExpandedReqs] = useState<string[]>([]);
  const [printingRequestId, setPrintingRequestId] = useState<string | null>(null);
  const isPrintingRef = useRef(false);
  const [returningRequestId, setReturningRequestId] = useState<string | null>(null);
  const isReturningRef = useRef(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    async function loadRequests() {
      if (!user) return;
      const [allRequests, allCustody] = await Promise.all([
        Storage.getRequests(),
        Storage.getCustodyRecords(),
      ]);
      setRequests(allRequests.filter(r => r.userId === user.uid).reverse());
      setMyCustody(allCustody.filter(c => c.userId === user.uid && c.status === 'active'));
    }
    loadRequests();
  }, [user]);

  const handleInitiateReturn = async (req: BorrowRequest) => {
    if (isReturningRef.current) return;
    isReturningRef.current = true;
    setReturningRequestId(req.requestId);
    try {
      const allRequests = await Storage.getRequests();
      const updated = allRequests.map(r =>
        r.requestId === req.requestId ? { ...r, status: 'returning' as const } : r
      );
      await Storage.saveRequests(updated);
      toast({
        title: 'Pemulangan Dimulakan',
        description: 'Admin akan menyemak dan meluluskan pemulangan anda selepas aset diterima.',
      });
      setRequests(updated.filter(r => r.userId === user!.uid).reverse());
    } catch {
      toast({ variant: "destructive", title: "Ralat", description: "Gagal memulakan proses pemulangan." });
    } finally {
      isReturningRef.current = false;
      setReturningRequestId(null);
    }
  };

  const handlePrintBorang = async (req: BorrowRequest) => {
    if (isPrintingRef.current) return;
    isPrintingRef.current = true;
    setPrintingRequestId(req.requestId);
    try {
      await printBorangKEWPA9(req, user!, [user!]);
    } catch {
      toast({ variant: "destructive", title: "Ralat", description: "Gagal menjana borang." });
    } finally {
      isPrintingRef.current = false;
      setPrintingRequestId(null);
    }
  };

  const toggleExpand = (reqId: string) => {
    setExpandedReqs(prev =>
      prev.includes(reqId) ? prev.filter(id => id !== reqId) : [...prev, reqId]
    );
  };

  const getStatusBadge = (status: string, returnDate?: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const isOverdue = status === 'approved' && returnDate && returnDate < todayStr;
    if (isOverdue) return <Badge variant="destructive" className="animate-pulse flex items-center gap-1 w-fit"><CalendarClock className="h-3 w-3" /> Tertunggak</Badge>;
    switch (status) {
      case 'approved': return <Badge className="bg-green-500 flex items-center gap-1 w-fit"><CheckCircle2 className="h-3 w-3" /> Diluluskan</Badge>;
      case 'pending': return <Badge className="bg-yellow-500 flex items-center gap-1 w-fit"><Clock className="h-3 w-3" /> Menunggu</Badge>;
      case 'returning': return <Badge className="bg-orange-400 flex items-center gap-1 w-fit"><RefreshCw className="h-3 w-3 animate-spin" /> Dalam Pemulangan</Badge>;
      case 'rejected': return <Badge className="bg-red-500 flex items-center gap-1 w-fit"><XCircle className="h-3 w-3" /> Ditolak</Badge>;
      case 'returned': return <Badge className="bg-blue-500 flex items-center gap-1 w-fit"><CheckCircle2 className="h-3 w-3" /> Dipulangkan</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Permohonan Saya</h1>
        <p className="text-muted-foreground">Pantau status sejarah pinjaman peralatan anda.</p>
      </div>

      {myCustody.length > 0 && (
        <Card className="shadow-md border-purple-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-purple-700">
              <ShieldCheck className="h-5 w-5" /> Aset Hak Jagaan Saya
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Aset jabatan yang diletakkan di bawah jagaan anda. Tiada tarikh pemulangan — aset kekal hak milik jabatan.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-purple-50/50">
                  <TableHead>Aset</TableHead>
                  <TableHead>Tarikh Diberi</TableHead>
                  <TableHead className="hidden md:table-cell">Lokasi</TableHead>
                  <TableHead className="hidden md:table-cell">Catatan</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myCustody.map((rec) => (
                  <TableRow key={rec.custodyId}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{rec.assetName}</span>
                        <code className="text-[10px] text-muted-foreground font-mono">{rec.assetTag}</code>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{rec.assignedDate}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs">{rec.location || <span className="text-muted-foreground italic">—</span>}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs">{rec.notes || <span className="text-muted-foreground italic">—</span>}</TableCell>
                    <TableCell><Badge className="bg-purple-600">Hak Jagaan</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-md">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Permohonan</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Tempoh Pinjaman</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Tindakan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-40 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <ClipboardList className="h-10 w-10 mb-2 opacity-20" />
                      <p>Anda belum membuat sebarang permohonan.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((req) => (
                  <React.Fragment key={req.requestId}>
                    <TableRow>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground uppercase">{req.requestId}</span>
                          <span className="text-xs text-muted-foreground">{req.purpose}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {req.items.slice(0, 2).map(item => (
                            <div key={item.itemId} className="text-xs">
                              <span>{item.assetName}</span>
                              {item.assignedSerialNumber && (
                                <code className="ml-1 text-[9px] bg-muted px-1 rounded">{item.assignedSerialNumber}</code>
                              )}
                            </div>
                          ))}
                          {req.items.length > 2 && (
                            <span className="text-[10px] text-muted-foreground">+{req.items.length - 2} lagi</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <p>{req.borrowDate}</p>
                          <p className={req.status === 'approved' && req.returnDate < new Date().toISOString().split('T')[0] ? 'text-destructive font-bold' : 'text-muted-foreground'}>
                            hingga {req.returnDate}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(req.status, req.returnDate)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 flex-wrap">
                          {req.status === 'approved' && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={returningRequestId === req.requestId}
                              onClick={() => handleInitiateReturn(req)}
                              className="gap-1"
                            >
                              {returningRequestId === req.requestId && <Loader2 className="h-3 w-3 animate-spin" />}
                              {returningRequestId === req.requestId ? 'Memproses...' : 'Pulangkan Aset'}
                            </Button>
                          )}
                          {req.status === 'returning' && (
                            <span className="text-xs text-muted-foreground italic">Menunggu Admin</span>
                          )}
                          {(req.status === 'approved' || req.status === 'returned' || req.status === 'pending') && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              disabled={printingRequestId === req.requestId}
                              onClick={() => handlePrintBorang(req)}
                            >
                              {printingRequestId === req.requestId ? (
                                <><Loader2 className="h-3 w-3 animate-spin" /> Menjana...</>
                              ) : (
                                <><Printer className="h-3 w-3" /> Cetak</>
                              )}
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toggleExpand(req.requestId)}>
                            {expandedReqs.includes(req.requestId) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Expanded items */}
                    {expandedReqs.includes(req.requestId) && (
                      <TableRow key={`${req.requestId}-expanded`}>
                        <TableCell colSpan={5} className="bg-muted/20 px-6 py-3">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Item dalam permohonan ini:</p>
                          <div className="space-y-2">
                            {req.items.map((item, idx) => (
                              <div key={item.itemId} className="flex items-center gap-3 text-xs">
                                <span className="text-muted-foreground">{idx + 1}.</span>
                                <span className="font-medium">{item.assetName}</span>
                                {item.assignedSerialNumber ? (
                                  <code className="bg-muted px-1 rounded text-[10px]">{item.assignedSerialNumber}</code>
                                ) : (
                                  <span className="text-muted-foreground italic text-[10px]">Menunggu penetapan unit</span>
                                )}
                                <Badge className={`text-[10px] ${item.status === 'approved' ? 'bg-green-500' : item.status === 'rejected' ? 'bg-red-500' : 'bg-yellow-500'}`}>
                                  {item.status === 'approved' ? 'Diluluskan' : item.status === 'rejected' ? 'Ditolak' : 'Menunggu'}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex gap-3 items-start">
        <AlertCircle className="h-5 w-5 text-primary shrink-0" />
        <div className="text-sm">
          <p className="font-bold text-primary">Perlukan bantuan teknikal?</p>
          <p className="text-muted-foreground">Jika anda menghadapi masalah dengan peralatan anda, sila hubungi Helpdesk IT dengan segera di sambungan 5555.</p>
        </div>
      </div>
    </div>
  );
}