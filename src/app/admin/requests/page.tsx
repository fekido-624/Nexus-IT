"use client"

import { useState, useEffect } from 'react';
import { Storage, BorrowRequest, AssetUnit, Asset, User } from '@/lib/storage';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, XCircle, Search, X, UserPlus, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { printBorangKEWPA9 } from '@/lib/print-borang';
import { Printer } from 'lucide-react';

const DEPARTMENTS = ['IT', 'Kewangan', 'Pentadbiran', 'HR', 'Operasi', 'Pemasaran'];
const STATUSES = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'returning', label: 'Returning' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'returned', label: 'Returned' },
];

export default function BorrowRequests() {
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [availableUnits, setAvailableUnits] = useState<AssetUnit[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<BorrowRequest | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isManualAssignOpen, setIsManualAssignOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [manualUnits, setManualUnits] = useState<AssetUnit[]>([]);
  const [manualForm, setManualForm] = useState({ userId: '', assetId: '', unitId: '', purpose: '', borrowDate: '', returnDate: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    async function initializeData() {
      try {
        const [users, assets, reqs] = await Promise.all([
          Storage.getUsers(),
          Storage.getAssets(),
          Storage.getRequests()
        ]);
        setAllUsers(users);
        setAllAssets(assets);
        setRequests(reqs.reverse());
      } catch (error) {
        console.error('Failed to initialize data:', error);
        toast({ variant: "destructive", title: "Error", description: "Failed to load data" });
      }
    }
    initializeData();
  }, [toast]);

  const loadData = async () => {
    try {
      const reqs = await Storage.getRequests();
      setRequests(reqs.reverse());
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({ variant: "destructive", title: "Error", description: "Failed to load data" });
    }
  };

  const handleOpenApprove = async (req: BorrowRequest) => {
    try {
      const units = await Storage.getUnits();

      console.log('ALL UNITS DETAIL:', JSON.stringify(units.map(u => ({
        unitId: u.unitId,
        assetId: u.assetId,
        assetTag: u.assetTag,
        status: u.currentStatus,
        condition: u.condition
      })), null, 2));
      console.log('REQUEST assetId:', req.assetId);

      const filtered = units.filter(u =>
        u.assetId === req.assetId &&
        u.currentStatus === 'available' &&
        u.condition !== 'lost' &&
        u.condition !== 'damaged'
      );

      console.log('AVAILABLE UNITS:', filtered);

      setAvailableUnits(filtered);
      setSelectedRequest(req);
      setIsApproveDialogOpen(true);
    } catch (error) {
      console.error('Failed to load available units:', error);
      toast({ variant: "destructive", title: "Error", description: "Failed to load available units" });
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest || !selectedUnitId || !user) return;
    try {
      const availableUnit = availableUnits.find(u => u.unitId === selectedUnitId);
      if (!availableUnit) return;

      const [allRequests, allUnits, allAssetsList] = await Promise.all([
        Storage.getRequests(),
        Storage.getUnits(),
        Storage.getAssets()
      ]);

      await Storage.saveRequests(allRequests.map(r =>
        r.requestId === selectedRequest.requestId
          ? { ...r, status: 'approved' as const, assignedUnitId: availableUnit.unitId, assignedAssetTag: availableUnit.assetTag, assignedSerialNumber: availableUnit.assetTag, approvedBy: user.name }
          : r
      ));

      await Storage.saveUnits(allUnits.map(u =>
        u.unitId === availableUnit.unitId
          ? { ...u, currentStatus: 'borrowed' as const, currentBorrowerId: selectedRequest.userId, currentBorrowerName: selectedRequest.userName, currentRequestId: selectedRequest.requestId }
          : u
      ));

      await Storage.saveAssets(allAssetsList.map(a =>
        a.assetId === selectedRequest.assetId
          ? { ...a, availableQty: Math.max(0, (a.availableQty || 1) - 1), status: 'borrowed' as const }
          : a
      ));

      toast({ title: "Request Approved", description: `Asset assigned to ${selectedRequest.userName}.` });
      setIsApproveDialogOpen(false);
      setSelectedRequest(null);
      setSelectedUnitId('');
      await loadData();
    } catch (error) {
      console.error('Failed to approve request:', error);
      toast({ variant: "destructive", title: "Error", description: "Failed to approve request" });
    }
  };

  const handleReject = async (req: BorrowRequest) => {
    try {
      const allRequests = await Storage.getRequests();
      await Storage.saveRequests(allRequests.map(r =>
        r.requestId === req.requestId ? { ...r, status: 'rejected' as const } : r
      ));
      toast({ variant: "destructive", title: "Request Rejected", description: "The borrow request was rejected." });
      await loadData();
    } catch (error) {
      console.error('Failed to reject request:', error);
      toast({ variant: "destructive", title: "Error", description: "Failed to reject request" });
    }
  };

  const handleApproveReturn = async (req: BorrowRequest) => {
    try {
      const [allRequests, allUnits, allAssetsList] = await Promise.all([
        Storage.getRequests(),
        Storage.getUnits(),
        Storage.getAssets()
      ]);

      await Storage.saveRequests(allRequests.map(r =>
        r.requestId === req.requestId ? { ...r, status: 'returned' as const } : r
      ));

      await Storage.saveUnits(allUnits.map(u =>
        u.unitId === req.assignedUnitId
          ? { ...u, currentStatus: 'available' as const, currentBorrowerId: '', currentBorrowerName: '', currentRequestId: '' }
          : u
      ));

      await Storage.saveAssets(allAssetsList.map(a =>
        a.assetId === req.assetId
          ? { ...a, availableQty: (a.availableQty || 0) + 1, status: 'available' as const }
          : a
      ));

      toast({ title: "Return Approved", description: `The unit from ${req.userName} is now available.` });
      await loadData();
    } catch (error) {
      console.error('Failed to approve return:', error);
      toast({ variant: "destructive", title: "Error", description: "Failed to approve return" });
    }
  };

  const handleAssetSelect = async (assetId: string) => {
    try {
      const units = await Storage.getUnits();
      const filtered = units.filter(u =>
        u.assetId === assetId &&
        u.currentStatus === 'available' &&
        u.condition !== 'lost' &&
        u.condition !== 'damaged'
      );
      setManualUnits(filtered);
      setManualForm({ ...manualForm, assetId, unitId: '' });
    } catch (error) {
      console.error('Failed to load units:', error);
      toast({ variant: "destructive", title: "Error", description: "Failed to load units" });
    }
  };

  const handleManualAssign = async () => {
    const { userId, assetId, unitId, purpose, borrowDate, returnDate } = manualForm;
    if (!userId || !assetId || !unitId || !borrowDate || !returnDate || !user) {
      toast({ variant: "destructive", title: "Incomplete Form", description: "Please fill in all details." });
      return;
    }
    try {
      const targetUser = allUsers.find(u => u.uid === userId);
      const targetAsset = allAssets.find(a => a.assetId === assetId);
      const targetUnit = manualUnits.find(u => u.unitId === unitId);
      if (!targetUser || !targetAsset || !targetUnit) return;

      const requestId = `REQ-MAN-${Date.now()}`;
      const newRequest: BorrowRequest = {
        requestId,
        userId: targetUser.uid,
        userName: targetUser.name,
        userDept: targetUser.department,
        assetId: targetAsset.assetId,
        assetName: `${targetAsset.brand} ${targetAsset.model}`,
        assignedUnitId: targetUnit.unitId,
        assignedAssetTag: targetUnit.assetTag,
        assignedSerialNumber: targetUnit.assetTag,
        quantity: 1,
        purpose,
        requestDate: new Date().toISOString().split('T')[0],
        borrowDate,
        returnDate,
        status: 'approved',
        approvedBy: user.name,
        notes: 'Manual assignment by admin'
      };

      const currentRequests = await Storage.getRequests();
      await Storage.saveRequests([...currentRequests, newRequest]);

      const allUnits = await Storage.getUnits();
      await Storage.saveUnits(allUnits.map(u =>
        u.unitId === targetUnit.unitId
          ? { ...u, currentStatus: 'borrowed' as const, currentBorrowerId: targetUser.uid, currentBorrowerName: targetUser.name, currentRequestId: requestId }
          : u
      ));

      const allAssetsList = await Storage.getAssets();
      await Storage.saveAssets(allAssetsList.map(a =>
        a.assetId === targetAsset.assetId
          ? { ...a, availableQty: Math.max(0, (a.availableQty || 1) - 1), status: 'borrowed' as const }
          : a
      ));

      toast({ title: "Asset Assigned", description: `Successfully assigned ${targetAsset.brand} to ${targetUser.name}.` });
      setIsManualAssignOpen(false);
      setManualForm({ userId: '', assetId: '', unitId: '', purpose: '', borrowDate: '', returnDate: '' });
      await loadData();
    } catch (error) {
      console.error('Failed to assign asset:', error);
      toast({ variant: "destructive", title: "Error", description: "Failed to assign asset" });
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDeptFilter('all');
  };

  const filteredRequests = requests.filter(req => {
    const todayStr = new Date().toISOString().split('T')[0];
    const isOverdue = req.status === 'approved' && req.returnDate < todayStr;
    const matchesSearch =
      (req.userName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (req.assetName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (req.requestId || "").toLowerCase().includes(searchTerm.toLowerCase());
    let matchesStatus = true;
    if (statusFilter === 'overdue') matchesStatus = isOverdue;
    else if (statusFilter !== 'all') matchesStatus = req.status === statusFilter;
    const matchesDept = deptFilter === 'all' || req.userDept === deptFilter;
    return matchesSearch && matchesStatus && matchesDept;
  });

  const getStatusBadge = (status: string, returnDate?: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const isOverdue = status === 'approved' && returnDate && returnDate < todayStr;
    if (isOverdue) return <Badge variant="destructive" className="animate-pulse">Overdue</Badge>;
    switch (status) {
      case 'approved': return <Badge className="bg-green-500">Approved</Badge>;
      case 'pending': return <Badge className="bg-yellow-500">Pending</Badge>;
      case 'returning': return <Badge className="bg-orange-400">Returning</Badge>;
      case 'rejected': return <Badge className="bg-red-500">Rejected</Badge>;
      case 'returned': return <Badge className="bg-blue-500">Returned</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-primary">Borrow Requests</h1>
          <p className="text-sm text-muted-foreground">Manage and approve equipment requests from staff.</p>
        </div>
        <Button className="w-full md:w-auto gap-2" onClick={() => setIsManualAssignOpen(true)}>
          <UserPlus className="h-4 w-4" /> Manual Assignment
        </Button>
      </div>

      <Card className="shadow-sm border-none bg-muted/30">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, asset or ID..."
                className="pl-9 bg-background"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 md:flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-background min-w-[120px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger className="bg-background min-w-[120px]">
                  <SelectValue placeholder="Dept" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Depts</SelectItem>
                  {DEPARTMENTS.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(searchTerm || statusFilter !== 'all' || deptFilter !== 'all') && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-10 text-muted-foreground">
                <X className="h-4 w-4 mr-1" /> Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Requester</TableHead>
                <TableHead className="hidden md:table-cell">Asset</TableHead>
                <TableHead className="hidden lg:table-cell">Dates</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Managed By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center text-muted-foreground">
                    No requests found matching filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((req) => (
                  <TableRow key={req.requestId}>
                    <TableCell>
                      <div className="font-medium text-xs md:text-sm">{req.userName}</div>
                      <div className="text-[9px] text-muted-foreground uppercase">{req.requestId}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex flex-col">
                        <span className="text-xs md:text-sm">{req.assetName}</span>
                        {req.assignedSerialNumber && (
                          <span className="text-[9px] font-mono bg-muted w-fit px-1 rounded">{req.assignedSerialNumber}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="text-[10px] md:text-xs">
                        <p>{req.borrowDate}</p>
                        <p className="text-muted-foreground">to {req.returnDate}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(req.status, req.returnDate)}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {req.approvedBy ? (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <ShieldCheck className="h-3 w-3 text-primary" />
                          <span>{req.approvedBy}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">Pending</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {req.status === 'pending' && (
                          <>
                            <Button size="icon" variant="outline" className="h-8 w-8 text-green-600 border-green-200" onClick={() => handleOpenApprove(req)}>
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="outline" className="h-8 w-8 text-red-600 border-red-200" onClick={() => handleReject(req)}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {(req.status === 'returning' || req.status === 'approved') && (
                          <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 h-8 text-[10px] md:text-xs" onClick={() => handleApproveReturn(req)}>
                            Confirm Return
                          </Button>
                        )} 
                        {/* Tambah ni */}
                        {(req.status === 'approved' || req.status === 'returned') && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-primary border-primary/30 h-8 text-[10px] md:text-xs gap-1"
                            onClick={() => printBorangKEWPA9(req, user!, allUsers)}
                          >
                            <Printer className="h-3 w-3" /> Print
                          </Button>
                        )}

                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>Assign Unit for Approval</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-muted/50 p-3 rounded-lg text-sm">
              <p><strong>Asset:</strong> {selectedRequest?.assetName}</p>
              <p><strong>Staff:</strong> {selectedRequest?.userName}</p>
            </div>
            <div className="grid gap-2">
              <Label>Select Available Unit (Serial Number)</Label>
              <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a serial number..." />
                </SelectTrigger>
                <SelectContent>
                  {availableUnits.length === 0 ? (
                    <SelectItem value="none" disabled>No units available</SelectItem>
                  ) : (
                    availableUnits.map(unit => (
                      <SelectItem key={unit.unitId} value={unit.unitId}>{unit.assetTag}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleApprove} disabled={!selectedUnitId}>Approve & Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Assignment Dialog */}
      <Dialog open={isManualAssignOpen} onOpenChange={setIsManualAssignOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>Direct Assignment</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Select Staff</Label>
              <Select value={manualForm.userId} onValueChange={(val) => setManualForm({...manualForm, userId: val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Search user..." />
                </SelectTrigger>
                <SelectContent>
                  {allUsers.map(u => (
                    <SelectItem key={u.uid} value={u.uid}>{u.name} ({u.department})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Asset Type</Label>
                <Select value={manualForm.assetId} onValueChange={handleAssetSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select asset..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allAssets.map(a => (
                      <SelectItem key={a.assetId} value={a.assetId}>{a.brand} {a.model}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Available Unit</Label>
                <Select
                  value={manualForm.unitId}
                  onValueChange={(val) => setManualForm({...manualForm, unitId: val})}
                  disabled={!manualForm.assetId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select serial..." />
                  </SelectTrigger>
                  <SelectContent>
                    {manualUnits.length === 0 ? (
                      <SelectItem value="none" disabled>No units</SelectItem>
                    ) : (
                      manualUnits.map(u => (
                        <SelectItem key={u.unitId} value={u.unitId}>{u.assetTag}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Borrow Date</Label>
                <Input type="date" value={manualForm.borrowDate} onChange={(e) => setManualForm({...manualForm, borrowDate: e.target.value})} />
              </div>
              <div className="grid gap-2">
                <Label>Return Date</Label>
                <Input type="date" value={manualForm.returnDate} onChange={(e) => setManualForm({...manualForm, returnDate: e.target.value})} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Purpose / Notes</Label>
              <Textarea
                placeholder="Manual assignment details..."
                value={manualForm.purpose}
                onChange={(e) => setManualForm({...manualForm, purpose: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsManualAssignOpen(false)}>Cancel</Button>
            <Button onClick={handleManualAssign} disabled={!manualForm.userId || !manualForm.unitId}>Assign Asset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}