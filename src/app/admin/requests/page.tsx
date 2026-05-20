"use client"

import { useState, useEffect } from 'react';
import { Storage, BorrowRequest, BorrowRequestItem, AssetUnit, Asset, User } from '@/lib/storage';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, XCircle, Search, X, UserPlus, ShieldCheck, Printer, ChevronDown, ChevronUp, Trash2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { printBorangKEWPA9 } from '@/lib/print-borang';
import React from 'react';

const DEPARTMENTS = ['IT', 'Kewangan', 'Pentadbiran', 'HR', 'Operasi', 'Pemasaran'];
const STATUSES = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'returning', label: 'Returning' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'returned', label: 'Returned' },
];

interface ItemApprovalState {
  [itemId: string]: {
    status: 'approved' | 'rejected' | 'pending';
    unitId: string;
  }
}

// Interface baru untuk simpan senarai aset yang dipilih dalam Manual Assign
interface ManualItem {
  assetId: string;
  unitId: string;
  assetName: string;
  assetTag: string;
}

export default function BorrowRequests() {
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [allUnitsData, setAllUnitsData] = useState<AssetUnit[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [expandedReqs, setExpandedReqs] = useState<string[]>([]);
  
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);

  // Approval dialog
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<BorrowRequest | null>(null);
  const [itemApprovalState, setItemApprovalState] = useState<ItemApprovalState>({});

  // Manual assign dialog (DIKEMAS KINI)
  const [isManualAssignOpen, setIsManualAssignOpen] = useState(false);
  const [manualUnits, setManualUnits] = useState<AssetUnit[]>([]);
  const [manualForm, setManualForm] = useState({ userId: '', purpose: '', borrowDate: '', returnDate: '' });
  const [manualItems, setManualItems] = useState<ManualItem[]>([]); // Menyimpan multiple assets
  const [tempAssetId, setTempAssetId] = useState('');
  const [tempUnitId, setTempUnitId] = useState('');
  
  // Return dialog
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [returnRequest, setReturnRequest] = useState<BorrowRequest | null>(null);
  const [returnItemIds, setReturnItemIds] = useState<string[]>([]);

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    try {
      const [users, assets, reqs, units] = await Promise.all([
        Storage.getUsers(), Storage.getAssets(), Storage.getRequests(), Storage.getUnits()
      ]);
      setAllUsers(users); setAllAssets(assets); setRequests(reqs.reverse()); setAllUnitsData(units);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to load data" });
    }
  };

  const loadData = async () => {
    try {
      const [reqs, units] = await Promise.all([Storage.getRequests(), Storage.getUnits()]);
      setRequests(reqs.reverse()); setAllUnitsData(units);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to load data" });
    }
  };

  const getAvailableUnitsForAsset = (assetId: string) => {
    return allUnitsData.filter(u => u.assetId === assetId && u.currentStatus === 'available' && u.condition !== 'lost' && u.condition !== 'damaged');
  };

  const handleDeleteSelected = async () => {
    if (!window.confirm(`Adakah anda pasti mahu memadam ${selectedRequestIds.length} rekod ini? Tindakan ini tidak boleh diundur.`)) {
      return;
    }

    try {
      let currentRequests = await Storage.getRequests();
      let units = await Storage.getUnits();
      let assets = await Storage.getAssets();

      const requestsToDelete = currentRequests.filter(r => selectedRequestIds.includes(r.requestId));
      const requestsToKeep = currentRequests.filter(r => !selectedRequestIds.includes(r.requestId));

      for (const req of requestsToDelete) {
        if (req.status === 'approved' || req.status === 'returning') {
          for (const item of req.items) {
            if (item.assignedUnitId && item.status !== 'returned' && item.status !== 'rejected') {
              units = units.map(u => u.unitId === item.assignedUnitId ? { ...u, currentStatus: 'available', currentBorrowerId: '', currentBorrowerName: '', currentRequestId: '' } : u);
              assets = assets.map(a => a.assetId === item.assetId ? { ...a, availableQty: (a.availableQty || 0) + 1 } : a);
            }
          }
        }
      }

      await Storage.saveRequests(requestsToKeep);
      await Storage.saveUnits(units);
      await Storage.saveAssets(assets);

      toast({ title: "Berjaya Dipadam", description: `${selectedRequestIds.length} rekod permohonan telah dipadam.` });
      setSelectedRequestIds([]); 
      await loadData(); 
    } catch (error) {
      toast({ variant: "destructive", title: "Ralat", description: "Gagal memadam rekod permohonan." });
    }
  };

  const handleOpenApprove = (req: BorrowRequest) => {
    const sortedReq = { ...req, items: [...req.items].sort((a, b) => a.assetId.localeCompare(b.assetId)) };
    setSelectedRequest(sortedReq);
    
    const initialState: ItemApprovalState = {};
    sortedReq.items.forEach(item => { initialState[item.itemId] = { status: 'approved', unitId: '' }; });
    setItemApprovalState(initialState);
    setIsApproveDialogOpen(true);
  };

  const handleApproveAll = () => {
    if (!selectedRequest) return;
    const newState: ItemApprovalState = {};
    selectedRequest.items.forEach(item => { newState[item.itemId] = { ...itemApprovalState[item.itemId], status: 'approved' }; });
    setItemApprovalState(newState);
  };

  const handleSubmitApproval = async () => {
    if (!selectedRequest || !user) return;
    try {
      const allRequests = await Storage.getRequests();
      const units = await Storage.getUnits();
      const assets = await Storage.getAssets();

      const updatedItems: BorrowRequestItem[] = selectedRequest.items.map(item => {
        const approval = itemApprovalState[item.itemId];
        if (!approval) return item;

        const assignedUnit = units.find(u => u.unitId === approval.unitId);
        return {
          ...item,
          status: approval.status,
          assignedUnitId: approval.status === 'approved' ? (assignedUnit?.unitId || '') : '',
          assignedAssetTag: approval.status === 'approved' ? (assignedUnit?.assetTag || '') : '',
          assignedSerialNumber: approval.status === 'approved' ? (assignedUnit?.assetTag || '') : '',
        };
      });

      const allApproved = updatedItems.every(i => i.status === 'approved');
      const allRejected = updatedItems.every(i => i.status === 'rejected');
      const overallStatus = allApproved ? 'approved' : allRejected ? 'rejected' : 'approved';

      await Storage.saveRequests(allRequests.map(r => r.requestId === selectedRequest.requestId ? { ...r, status: overallStatus as any, approvedBy: user.name, items: updatedItems } : r));

      let updatedUnits = [...units];
      let updatedAssets = [...assets];
      for (const item of updatedItems) {
        if (item.status === 'approved' && item.assignedUnitId) {
          updatedUnits = updatedUnits.map(u => u.unitId === item.assignedUnitId ? { ...u, currentStatus: 'borrowed' as const, currentBorrowerId: selectedRequest.userId, currentBorrowerName: selectedRequest.userName, currentRequestId: selectedRequest.requestId } : u);
          updatedAssets = updatedAssets.map(a => a.assetId === item.assetId ? { ...a, availableQty: Math.max(0, (a.availableQty || 1) - 1) } : a);
        }
      }
      await Storage.saveUnits(updatedUnits);
      await Storage.saveAssets(updatedAssets);

      toast({ title: "Request Processed", description: `Request from ${selectedRequest.userName} has been processed.` });
      setIsApproveDialogOpen(false);
      setSelectedRequest(null);
      await loadData();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to process request" });
    }
  };

  const handleReject = async (req: BorrowRequest) => {
    try {
      const allRequests = await Storage.getRequests();
      await Storage.saveRequests(allRequests.map(r => r.requestId === req.requestId ? { ...r, status: 'rejected' as const, items: r.items.map(i => ({ ...i, status: 'rejected' as const })) } : r));
      toast({ variant: "destructive", title: "Request Rejected", description: "The borrow request was rejected." });
      await loadData();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to reject request" });
    }
  };

  const handleSubmitReturn = async () => {
    if (!returnRequest) return;
    try {
      const [allRequests, units, assets] = await Promise.all([ Storage.getRequests(), Storage.getUnits(), Storage.getAssets() ]);

      const updatedItems: BorrowRequestItem[] = returnRequest.items.map(item => {
        if (returnItemIds.includes(item.itemId)) {
          return { ...item, status: 'returned' as any };
        }
        return item;
      });

      const allItemsReturnedOrRejected = updatedItems.every(i => i.status === 'returned' || i.status === 'rejected');
      const newOverallStatus = allItemsReturnedOrRejected ? 'returned' : 'returning';

      const newRequestsList = allRequests.map(r => r.requestId === returnRequest.requestId ? { ...r, status: newOverallStatus as any, items: updatedItems } : r);
      await Storage.saveRequests(newRequestsList);

      let updatedUnits = [...units];
      let updatedAssets = [...assets];

      for (const itemId of returnItemIds) {
        const item = returnRequest.items.find(i => i.itemId === itemId);
        if (item && item.assignedUnitId) {
          updatedUnits = updatedUnits.map(u => u.unitId === item.assignedUnitId ? { ...u, currentStatus: 'available' as const, currentBorrowerId: '', currentBorrowerName: '', currentRequestId: '' } : u);
          updatedAssets = updatedAssets.map(a => a.assetId === item.assetId ? { ...a, availableQty: (a.availableQty || 0) + 1 } : a);
        }
      }

      await Storage.saveUnits(updatedUnits);
      await Storage.saveAssets(updatedAssets);

      toast({ title: "Return Processed", description: `Selected items have been returned successfully.` });
      
      setRequests(newRequestsList.reverse()); 
      setIsReturnDialogOpen(false);
      setReturnRequest(null);
      setReturnItemIds([]);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to process return" });
    }
  };

  // ==========================================
  // LOGIK MANUAL ASSIGNMENT BAHARU (MULTIPLE)
  // ==========================================

  const handleAssetSelect = (assetId: string) => {
    // Tapis unit yang 'available' DAN belum dimasukkan dalam senarai (cart)
    const filtered = allUnitsData.filter(u => u.assetId === assetId && u.currentStatus === 'available' && u.condition !== 'lost' && u.condition !== 'damaged' && !manualItems.some(item => item.unitId === u.unitId));
    setManualUnits(filtered);
    setTempAssetId(assetId);
    setTempUnitId('');
  };

  const handleAddManualItem = () => {
    if (!tempAssetId || !tempUnitId) return;
    
    const targetAsset = allAssets.find(a => a.assetId === tempAssetId);
    const targetUnit = manualUnits.find(u => u.unitId === tempUnitId);

    if (targetAsset && targetUnit) {
      setManualItems([...manualItems, {
        assetId: targetAsset.assetId,
        unitId: targetUnit.unitId,
        assetName: `${targetAsset.brand} ${targetAsset.model}`,
        assetTag: targetUnit.assetTag
      }]);
      setTempAssetId('');
      setTempUnitId('');
      setManualUnits([]);
    }
  };

  const handleRemoveManualItem = (unitId: string) => {
    setManualItems(manualItems.filter(item => item.unitId !== unitId));
  };

  const handleManualAssignSubmit = async () => {
    const { userId, purpose, borrowDate, returnDate } = manualForm;
    if (!userId || !borrowDate || !returnDate || manualItems.length === 0 || !user) {
      toast({ variant: "destructive", title: "Incomplete Form", description: "Please fill in all details and select at least one asset." }); 
      return;
    }
    
    try {
      const targetUser = allUsers.find(u => u.uid === userId);
      if (!targetUser) return;

      const requestId = `REQ-MAN-${Date.now()}`;
      const reqItems: BorrowRequestItem[] = [];
      
      let allUnits = await Storage.getUnits();
      let allAssetsList = await Storage.getAssets();

      // Loop semua items yang dipilih dalam cart admin
      for (let i = 0; i < manualItems.length; i++) {
        const selected = manualItems[i];
        
        reqItems.push({
          itemId: `ITEM-${Date.now()}-${i}`,
          requestId,
          assetId: selected.assetId,
          assetName: selected.assetName,
          assignedUnitId: selected.unitId,
          assignedAssetTag: selected.assetTag,
          assignedSerialNumber: selected.assetTag,
          status: 'approved',
          notes: ''
        });

        // Kemas kini database unit & asset kuantiti
        allUnits = allUnits.map(u => u.unitId === selected.unitId ? { ...u, currentStatus: 'borrowed' as const, currentBorrowerId: targetUser.uid, currentBorrowerName: targetUser.name, currentRequestId: requestId } : u);
        allAssetsList = allAssetsList.map(a => a.assetId === selected.assetId ? { ...a, availableQty: Math.max(0, (a.availableQty || 1) - 1) } : a);
      }

      const newRequest: BorrowRequest = {
        requestId, userId: targetUser.uid, userName: targetUser.name, userDept: targetUser.department, purpose,
        requestDate: new Date().toISOString().split('T')[0], borrowDate, returnDate, status: 'approved', approvedBy: user.name, notes: 'Manual assignment by admin',
        items: reqItems
      };

      const currentRequests = await Storage.getRequests();
      await Storage.saveRequests([...currentRequests, newRequest]);
      await Storage.saveUnits(allUnits);
      await Storage.saveAssets(allAssetsList);

      toast({ title: "Assets Assigned", description: `Successfully assigned ${manualItems.length} unit(s) to ${targetUser.name}.` });
      
      setIsManualAssignOpen(false); 
      setManualForm({ userId: '', purpose: '', borrowDate: '', returnDate: '' });
      setManualItems([]);
      await loadData();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to assign asset" });
    }
  };

  const toggleExpand = (reqId: string) => {
    setExpandedReqs(prev => prev.includes(reqId) ? prev.filter(id => id !== reqId) : [...prev, reqId]);
  };

  const filteredRequests = requests.filter(req => {
    const matchesSearch = (req.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) || (req.requestId || '').toLowerCase().includes(searchTerm.toLowerCase()) || req.items.some(i => (i.assetName || '').toLowerCase().includes(searchTerm.toLowerCase()));
    let matchesStatus = statusFilter === 'all' || req.status === statusFilter;
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
        <div className="flex w-full md:w-auto gap-2">
          {selectedRequestIds.length > 0 && (
            <Button variant="destructive" className="gap-2" onClick={handleDeleteSelected}>
              <Trash2 className="h-4 w-4" /> Padam ({selectedRequestIds.length})
            </Button>
          )}
          <Button className="w-full md:w-auto gap-2" onClick={() => setIsManualAssignOpen(true)}>
            <UserPlus className="h-4 w-4" /> Manual Assignment
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="shadow-sm border-none bg-muted/30">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search name, asset or ID..." className="pl-9 bg-background" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 md:flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-background min-w-[120px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger className="bg-background min-w-[120px]"><SelectValue placeholder="Dept" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Depts</SelectItem>
                  {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {(searchTerm || statusFilter !== 'all' || deptFilter !== 'all') && (
              <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(''); setStatusFilter('all'); setDeptFilter('all'); }} className="h-10 text-muted-foreground">
                <X className="h-4 w-4 mr-1" /> Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card className="shadow-md">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[40px] px-4">
                  <input 
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer rounded border-gray-300"
                    checked={filteredRequests.length > 0 && selectedRequestIds.length === filteredRequests.length}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedRequestIds(filteredRequests.map(r => r.requestId));
                      else setSelectedRequestIds([]);
                    }}
                  />
                </TableHead>
                <TableHead>Requester</TableHead>
                <TableHead className="hidden md:table-cell">Items</TableHead>
                <TableHead className="hidden lg:table-cell">Dates</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Managed By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-40 text-center text-muted-foreground">No requests found.</TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((req) => (
                  <React.Fragment key={req.requestId}>
                    <TableRow className={selectedRequestIds.includes(req.requestId) ? "bg-muted/30" : ""}>
                      <TableCell className="w-[40px] px-4">
                        <input 
                          type="checkbox"
                          className="h-4 w-4 cursor-pointer rounded border-gray-300"
                          checked={selectedRequestIds.includes(req.requestId)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedRequestIds(prev => [...prev, req.requestId]);
                            else setSelectedRequestIds(prev => prev.filter(id => id !== req.requestId));
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-xs md:text-sm">{req.userName}</div>
                        <div className="text-[9px] text-muted-foreground uppercase">{req.requestId}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex flex-col gap-1">
                          {req.items.slice(0, 2).map(item => (
                            <div key={item.itemId} className="text-xs">
                              <span>{item.assetName}</span>
                              {item.assignedSerialNumber && (
                                <span className="ml-1 text-[9px] font-mono bg-muted px-1 rounded">{item.assignedSerialNumber}</span>
                              )}
                            </div>
                          ))}
                          {req.items.length > 2 && (
                            <span className="text-[10px] text-muted-foreground">+{req.items.length - 2} more</span>
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
                        <div className="flex justify-end gap-1 flex-wrap">
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
                            <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 h-8 text-[10px] md:text-xs" onClick={() => { setReturnRequest(req); setIsReturnDialogOpen(true); setReturnItemIds([]); }}>
                              Confirm Return
                            </Button>
                          )}
                          {(req.status === 'approved' || req.status === 'returned') && (
                            <Button size="sm" variant="outline" className="text-primary border-primary/30 h-8 text-[10px] md:text-xs gap-1" onClick={() => printBorangKEWPA9(req, user!, allUsers)}>
                              <Printer className="h-3 w-3" /> Print
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toggleExpand(req.requestId)}>
                            {expandedReqs.includes(req.requestId) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedReqs.includes(req.requestId) && (
                      <TableRow key={`${req.requestId}-expanded`}>
                        <TableCell colSpan={7} className="bg-muted/20 px-6 py-3">
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Items in this request:</p>
                            {req.items.map((item, idx) => (
                              <div key={item.itemId} className="flex items-center gap-3 text-xs">
                                <span className="text-muted-foreground">{idx + 1}.</span>
                                <span className="font-medium">{item.assetName}</span>
                                {item.assignedSerialNumber && (
                                  <span className="font-mono bg-muted px-1 rounded text-[10px]">{item.assignedSerialNumber}</span>
                                )}
                                <Badge className={`text-[10px] ${item.status === 'approved' ? 'bg-green-500' : item.status === 'rejected' ? 'bg-red-500' : item.status === 'returned' ? 'bg-blue-500' : 'bg-yellow-500'}`}>
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

      {/* Approval Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-2xl rounded-xl">
          <DialogHeader><DialogTitle>Process Borrow Request</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-muted/50 p-3 rounded-lg text-sm">
              <p><strong>Staff:</strong> {selectedRequest?.userName} ({selectedRequest?.userDept})</p>
              <p><strong>Tempoh:</strong> {selectedRequest?.borrowDate} hingga {selectedRequest?.returnDate}</p>
              <p><strong>Tujuan:</strong> {selectedRequest?.purpose}</p>
            </div>
            <div className="flex justify-end">
              <Button size="sm" variant="outline" className="gap-1 text-green-600 border-green-200" onClick={handleApproveAll}>
                <CheckCircle2 className="h-3 w-3" /> Lulus Semua
              </Button>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {selectedRequest?.items.map(item => {
                const approval = itemApprovalState[item.itemId] || { status: 'pending', unitId: '' };
                const availableUnits = getAvailableUnitsForAsset(item.assetId);
                return (
                  <div key={item.itemId} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{item.assetName}</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant={approval.status === 'approved' ? 'default' : 'outline'} className={`h-7 text-xs gap-1 ${approval.status === 'approved' ? 'bg-green-500 hover:bg-green-600' : 'text-green-600 border-green-200'}`} onClick={() => setItemApprovalState(prev => ({ ...prev, [item.itemId]: { ...prev[item.itemId], status: 'approved' } }))}>
                          <CheckCircle2 className="h-3 w-3" /> Lulus
                        </Button>
                        <Button size="sm" variant={approval.status === 'rejected' ? 'destructive' : 'outline'} className={`h-7 text-xs gap-1 ${approval.status !== 'rejected' ? 'text-red-600 border-red-200' : ''}`} onClick={() => setItemApprovalState(prev => ({ ...prev, [item.itemId]: { ...prev[item.itemId], status: 'rejected', unitId: '' } }))}>
                          <XCircle className="h-3 w-3" /> Tolak
                        </Button>
                      </div>
                    </div>
                    {approval.status === 'approved' && (
                      <div className="grid gap-1">
                        <Label className="text-xs">Pilih Serial Number</Label>
                        <Select value={approval.unitId} onValueChange={(val) => setItemApprovalState(prev => ({ ...prev, [item.itemId]: { ...prev[item.itemId], unitId: val } }))}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pilih unit..." /></SelectTrigger>
                          <SelectContent>
                            {availableUnits.length === 0 ? <SelectItem value="none" disabled>Tiada unit available</SelectItem> : availableUnits.map(u => {
                              const alreadyPicked = Object.entries(itemApprovalState).some(([id, val]) => id !== item.itemId && val.unitId === u.unitId);
                              return <SelectItem key={u.unitId} value={u.unitId} disabled={alreadyPicked}>{u.assetTag} {alreadyPicked ? '(Dipilih)' : ''}</SelectItem>;
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitApproval} disabled={selectedRequest?.items.some(item => { const approval = itemApprovalState[item.itemId]; return approval?.status === 'approved' && !approval?.unitId; })}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Assignment Dialog (MULTIPLE ASSETS) */}
      <Dialog open={isManualAssignOpen} onOpenChange={setIsManualAssignOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-xl rounded-xl">
          <DialogHeader><DialogTitle>Direct Assignment</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2 max-h-[80vh] overflow-y-auto">
            
            {/* Bahagian Borang Utama */}
            <div className="grid gap-2">
              <Label>Select Staff</Label>
              <Select value={manualForm.userId} onValueChange={(val) => setManualForm({...manualForm, userId: val})}>
                <SelectTrigger><SelectValue placeholder="Search user..." /></SelectTrigger>
                <SelectContent>{allUsers.map(u => <SelectItem key={u.uid} value={u.uid}>{u.name} ({u.department})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Borrow Date</Label><Input type="date" value={manualForm.borrowDate} onChange={(e) => setManualForm({...manualForm, borrowDate: e.target.value})} /></div>
              <div className="grid gap-2"><Label>Return Date</Label><Input type="date" value={manualForm.returnDate} onChange={(e) => setManualForm({...manualForm, returnDate: e.target.value})} /></div>
            </div>
            <div className="grid gap-2"><Label>Purpose / Notes</Label><Textarea placeholder="Manual assignment details..." value={manualForm.purpose} onChange={(e) => setManualForm({...manualForm, purpose: e.target.value})} /></div>

            {/* Bahagian Cart (Tambah Item Berbilang) */}
            <div className="border rounded-xl p-4 bg-muted/20 space-y-4">
              <Label className="text-primary font-bold">Add Equipment to Assign</Label>
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 grid gap-2">
                  <Select value={tempAssetId} onValueChange={handleAssetSelect}>
                    <SelectTrigger className="bg-background"><SelectValue placeholder="1. Select asset model..." /></SelectTrigger>
                    <SelectContent>{allAssets.map(a => <SelectItem key={a.assetId} value={a.assetId}>{a.brand} {a.model}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex-1 grid gap-2">
                  <Select value={tempUnitId} onValueChange={setTempUnitId} disabled={!tempAssetId}>
                    <SelectTrigger className="bg-background"><SelectValue placeholder="2. Select serial..." /></SelectTrigger>
                    <SelectContent>
                      {manualUnits.length === 0 ? <SelectItem value="none" disabled>No units available</SelectItem> : manualUnits.map(u => <SelectItem key={u.unitId} value={u.unitId}>{u.assetTag}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button className="mt-auto gap-2" onClick={handleAddManualItem} disabled={!tempAssetId || !tempUnitId}>
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>

              {/* Senarai Item Yang Bakal Diberikan */}
              {manualItems.length > 0 && (
                <div className="space-y-2 mt-4 border-t pt-4">
                  <Label className="text-xs text-muted-foreground uppercase">Selected Items ({manualItems.length})</Label>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                    {manualItems.map(item => (
                      <div key={item.unitId} className="flex items-center justify-between bg-background border p-2 rounded-lg">
                        <div className="text-sm">
                          <span className="font-medium">{item.assetName}</span>
                          <Badge variant="secondary" className="ml-2 font-mono text-[10px]">{item.assetTag}</Badge>
                        </div>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleRemoveManualItem(item.unitId)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
          <DialogFooter className="gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => { setIsManualAssignOpen(false); setManualItems([]); }}>Cancel</Button>
            <Button onClick={handleManualAssignSubmit} disabled={!manualForm.userId || manualItems.length === 0}>
              Assign {manualItems.length > 0 ? `${manualItems.length} Asset(s)` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog> 

      {/* Return Dialog */}
      <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-md rounded-xl">
          <DialogHeader><DialogTitle>Confirm Return</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-muted/50 p-3 rounded-lg text-sm">
              <p><strong>Staff:</strong> {returnRequest?.userName}</p>
              <p><strong>Tempoh:</strong> {returnRequest?.borrowDate} — {returnRequest?.returnDate}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase">Pilih item yang dikembalikan</Label>
              <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                {returnRequest?.items.filter(i => i.assignedUnitId && i.status !== 'returned' && i.status !== 'rejected').map(item => (
                  <div key={item.itemId} className="flex items-center gap-3 px-3 py-2">
                    <input type="checkbox" id={item.itemId} checked={returnItemIds.includes(item.itemId)} onChange={(e) => { if (e.target.checked) setReturnItemIds(prev => [...prev, item.itemId]); else setReturnItemIds(prev => prev.filter(id => id !== item.itemId)); }} className="h-4 w-4" />
                    <label htmlFor={item.itemId} className="flex-1 cursor-pointer">
                      <p className="text-sm font-medium">{item.assetName}</p>
                      {item.assignedSerialNumber && <code className="text-[10px] bg-muted px-1 rounded">{item.assignedSerialNumber}</code>}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <button className="underline" onClick={() => setReturnItemIds(returnRequest?.items.filter(i => i.assignedUnitId && i.status !== 'returned' && i.status !== 'rejected').map(i => i.itemId) || [])}>Pilih Semua</button>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsReturnDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitReturn} disabled={returnItemIds.length === 0}>Confirm Return ({returnItemIds.length} item)</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}