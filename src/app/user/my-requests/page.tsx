"use client"

import { useState, useEffect } from 'react';
import { Storage, BorrowRequest } from '@/lib/storage';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { useAuth } from '@/hooks/use-auth';
import { ClipboardList, AlertCircle, CheckCircle2, Clock, XCircle, RefreshCw, CalendarClock, ChevronDown, ChevronUp, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { printBorangKEWPA9 } from '@/lib/print-borang';
import React from 'react';

export default function MyRequests() {
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [expandedReqs, setExpandedReqs] = useState<string[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    async function loadRequests() {
      if (!user) return;
      const allRequests = await Storage.getRequests();
      setRequests(allRequests.filter(r => r.userId === user.uid).reverse());
    }
    loadRequests();
  }, [user]);

  const handleInitiateReturn = async (req: BorrowRequest) => {
    const allRequests = await Storage.getRequests();
    const updated = allRequests.map(r =>
      r.requestId === req.requestId ? { ...r, status: 'returning' as const } : r
    );
    await Storage.saveRequests(updated);
    toast({
      title: 'Return Initiated',
      description: 'Admin will review and approve your return once the asset is received.',
    });
    setRequests(updated.filter(r => r.userId === user!.uid).reverse());
  };

  const toggleExpand = (reqId: string) => {
    setExpandedReqs(prev =>
      prev.includes(reqId) ? prev.filter(id => id !== reqId) : [...prev, reqId]
    );
  };

  const getStatusBadge = (status: string, returnDate?: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const isOverdue = status === 'approved' && returnDate && returnDate < todayStr;
    if (isOverdue) return <Badge variant="destructive" className="animate-pulse flex items-center gap-1 w-fit"><CalendarClock className="h-3 w-3" /> Overdue</Badge>;
    switch (status) {
      case 'approved': return <Badge className="bg-green-500 flex items-center gap-1 w-fit"><CheckCircle2 className="h-3 w-3" /> Approved</Badge>;
      case 'pending': return <Badge className="bg-yellow-500 flex items-center gap-1 w-fit"><Clock className="h-3 w-3" /> Pending</Badge>;
      case 'returning': return <Badge className="bg-orange-400 flex items-center gap-1 w-fit"><RefreshCw className="h-3 w-3 animate-spin" /> Returning</Badge>;
      case 'rejected': return <Badge className="bg-red-500 flex items-center gap-1 w-fit"><XCircle className="h-3 w-3" /> Rejected</Badge>;
      case 'returned': return <Badge className="bg-blue-500 flex items-center gap-1 w-fit"><CheckCircle2 className="h-3 w-3" /> Returned</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">My Requests</h1>
        <p className="text-muted-foreground">Monitor the status of your equipment borrow history.</p>
      </div>

      <Card className="shadow-md">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Request</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Borrow Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-40 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <ClipboardList className="h-10 w-10 mb-2 opacity-20" />
                      <p>You haven't made any requests yet.</p>
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
                            <span className="text-[10px] text-muted-foreground">+{req.items.length - 2} more</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <p>{req.borrowDate}</p>
                          <p className={req.status === 'approved' && req.returnDate < new Date().toISOString().split('T')[0] ? 'text-destructive font-bold' : 'text-muted-foreground'}>
                            to {req.returnDate}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(req.status, req.returnDate)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 flex-wrap">
                          {req.status === 'approved' && (
                            <Button size="sm" variant="outline" onClick={() => handleInitiateReturn(req)}>
                              Return Asset
                            </Button>
                          )}
                          {req.status === 'returning' && (
                            <span className="text-xs text-muted-foreground italic">Awaiting Admin</span>
                          )}
                          {(req.status === 'approved' || req.status === 'returned' || req.status === 'pending') && (
                            <Button size="sm" variant="outline" className="gap-1" onClick={() => printBorangKEWPA9(req, user!, [user!])}>
                              <Printer className="h-3 w-3" /> Print
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
                          <p className="text-xs font-medium text-muted-foreground mb-2">Items in this request:</p>
                          <div className="space-y-2">
                            {req.items.map((item, idx) => (
                              <div key={item.itemId} className="flex items-center gap-3 text-xs">
                                <span className="text-muted-foreground">{idx + 1}.</span>
                                <span className="font-medium">{item.assetName}</span>
                                {item.assignedSerialNumber ? (
                                  <code className="bg-muted px-1 rounded text-[10px]">{item.assignedSerialNumber}</code>
                                ) : (
                                  <span className="text-muted-foreground italic text-[10px]">Pending assignment</span>
                                )}
                                <Badge className={`text-[10px] ${item.status === 'approved' ? 'bg-green-500' : item.status === 'rejected' ? 'bg-red-500' : 'bg-yellow-500'}`}>
                                  {item.status}
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
          <p className="font-bold text-primary">Need technical help?</p>
          <p className="text-muted-foreground">If you encounter issues with your equipment, please contact the IT Helpdesk immediately at extension 5555.</p>
        </div>
      </div>
    </div>
  );
}