"use client"

import { useState, useEffect } from 'react';
import { Storage, Asset, AssetUnit, BorrowRequest } from '@/lib/storage';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  ArrowUpRight, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  CalendarClock
} from 'lucide-react';
import { addDays } from 'date-fns';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell 
} from '@/components/ui/table';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalAssets: 0,
    totalUnits: 0,
    borrowedUnits: 0,
    pendingRequests: 0,
    overdueCount: 0,
    damagedCount: 0,
    goodCount: 0,
    lostCount: 0,
  });
  
  const [recentRequests, setRecentRequests] = useState<BorrowRequest[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [damagedUnitsList, setDamagedUnitsList] = useState<AssetUnit[]>([]);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const assets = await Storage.getAssets();
        const units = await Storage.getUnits();
        const requests = await Storage.getRequests();

        const todayStr = new Date().toISOString().split('T')[0];
        
        const borrowed = units.filter((u: AssetUnit) => u.currentStatus === 'borrowed').length;
        const pending = requests.filter((r: BorrowRequest) => r.status === 'pending' || r.status === 'returning').length;
        const good = units.filter((u: AssetUnit) => u.condition === 'good').length;
        const damaged = units.filter((u: AssetUnit) => u.condition === 'damaged').length;
        const lost = units.filter((u: AssetUnit) => u.condition === 'lost').length;
        
        const overdue = requests.filter((r: BorrowRequest) => 
          r.status === 'approved' && r.returnDate < todayStr
        ).length;

        setStats({
          totalAssets: assets.length,
          totalUnits: units.length,
          borrowedUnits: borrowed,
          pendingRequests: pending,
          overdueCount: overdue,
          goodCount: good,
          damagedCount: damaged,
          lostCount: lost,
        });

        setDamagedUnitsList(units.filter((u: AssetUnit) => u.condition === 'damaged'));
        setRecentRequests(requests.slice(-5).reverse());
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      }
    }
    
    loadDashboardData();
  }, []);

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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Admin Dashboard</h1>
        <p className="text-muted-foreground">Overview of IT assets, units, and requests.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAssets}</div>
            <p className="text-xs text-muted-foreground">Categories managed</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Currently Borrowed</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.borrowedUnits}</div>
            <p className="text-xs text-muted-foreground">In use by staff</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Actions</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingRequests}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Returns</CardTitle>
            <CalendarClock className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.overdueCount}</div>
            <p className="text-xs text-muted-foreground">Passed return date</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        {/* Recent Requests */}
        <Card className="md:col-span-4 shadow-md">
          <CardHeader>
            <CardTitle>Recent Borrow Requests</CardTitle>
            <CardDescription>Latest activity from staff.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentRequests.length === 0 ? (
                <p className="text-sm text-center text-muted-foreground py-10">No recent requests.</p>
              ) : (
                recentRequests.map((req) => (
                  <div key={req.requestId} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div>
                      <p className="font-semibold text-sm">{req.userName}</p>
                      <p className="text-xs text-muted-foreground">
                        {req.items?.[0]?.assetName || 'Tiada Perkakasan'}
                        {req.items && req.items.length > 1 ? ` (+${req.items.length - 1} item lagi)` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(req.status, req.returnDate)}
                      <p className="text-[10px] text-muted-foreground mt-1">{req.requestDate}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Condition Summary */}
        <Card className="md:col-span-3 shadow-md">
          <CardHeader>
            <CardTitle>Inventory Health</CardTitle>
            <CardDescription>Status of physical units.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-2 rounded-xl transition-colors">
              <div className="bg-green-100 p-2 rounded-lg"><CheckCircle2 className="h-5 w-5 text-green-600" /></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Good Condition</p>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-green-500" style={{ width: `${(stats.goodCount / stats.totalUnits) * 100 || 0}%` }}></div>
                </div>
              </div>
              <p className="text-sm font-bold">{stats.goodCount}</p>
            </div>

            <div 
              onClick={() => setIsDialogOpen(true)}
              className="flex items-center gap-4 p-2 rounded-xl cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-950/20 border border-transparent hover:border-orange-200 transition-all group"
            >
              <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-lg group-hover:scale-105 transition-transform">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-orange-600 font-semibold transition-colors flex items-center gap-1">
                  Damaged / Maintenance 
                  <span className="text-xs font-normal text-muted-foreground group-hover:translate-x-0.5 transition-transform">→</span>
                </p>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-orange-500" style={{ width: `${(stats.damagedCount / stats.totalUnits) * 100 || 0}%` }}></div>
                </div>
              </div>
              <p className="text-sm font-bold text-orange-600">{stats.damagedCount}</p>
            </div>

            <div className="flex items-center gap-4 p-2 rounded-xl transition-colors">
              <div className="bg-red-100 p-2 rounded-lg"><XCircle className="h-5 w-5 text-red-600" /></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Lost / Unaccounted</p>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-red-500" style={{ width: `${(stats.lostCount / stats.totalUnits) * 100 || 0}%` }}></div>
                </div>
              </div>
              <p className="text-sm font-bold">{stats.lostCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" /> Senarai Item Rosak / Penyelenggaraan
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-4 border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-bold">No. Siri / Tag</TableHead>
                  <TableHead className="font-bold">Nama Item</TableHead>
                  <TableHead className="font-bold">Jenama / Model</TableHead>
                  <TableHead className="font-bold">Nota / Catatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {damagedUnitsList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      Tiada rekod barangan rosak ditemui.
                    </TableCell>
                  </TableRow>
                ) : (
                  damagedUnitsList.map((unit) => (
                    <TableRow key={unit.unitId} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-xs text-red-600 font-semibold">
                        {unit.assetTag || 'Tiada Tag'}
                      </TableCell>
                      <TableCell className="font-medium text-sm">{unit.assetName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {unit.brand} {unit.model}
                      </TableCell>
                      <TableCell className="text-xs italic text-gray-500 max-w-[180px] truncate">
                        {unit.notes || 'Tiada catatan kerosakan'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}