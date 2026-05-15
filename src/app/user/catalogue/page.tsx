
"use client"

import { useState, useEffect } from 'react';
import { Storage, Asset } from '@/lib/storage';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, Laptop, Monitor, MousePointer, Projector, Printer, Network, Power, Box } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

export default function AssetCatalogue() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Form state
  const [purpose, setPurpose] = useState('');
  const [borrowDate, setBorrowDate] = useState('');
  const [returnDate, setReturnDate] = useState('');

  useEffect(() => {
    async function loadAssets() {
      await Storage.init();
      const data = await Storage.getAssets();
      setAssets(data);
    }

    loadAssets();
  }, []);

  const filteredAssets = assets.filter(asset =>
    asset.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.assetTag.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Laptop': return <Laptop className="h-10 w-10 text-primary" />;
      case 'Monitor': return <Monitor className="h-10 w-10 text-primary" />;
      case 'Keyboard':
      case 'Mouse': return <MousePointer className="h-10 w-10 text-primary" />;
      case 'Projector': return <Projector className="h-10 w-10 text-primary" />;
      case 'Printer': return <Printer className="h-10 w-10 text-primary" />;
      case 'Networking': return <Network className="h-10 w-10 text-primary" />;
      case 'UPS': return <Power className="h-10 w-10 text-primary" />;
      default: return <Box className="h-10 w-10 text-primary" />;
    }
  };

  const handleOpenRequest = (asset: Asset) => {
    setSelectedAsset(asset);
    setRequestModalOpen(true);
  };

  const handleSubmitRequest = async () => {
    if (!user || !selectedAsset) return;

    const requests = await Storage.getRequests();
    const newRequest = {
      requestId: `REQ-${Date.now()}`,
      userId: user.uid,
      userName: user.name,
      userDept: user.department,
      assetId: selectedAsset.assetId,
      assetName: `${selectedAsset.brand} ${selectedAsset.model}`,
      assignedUnitId: '',
      assignedAssetTag: '',
      quantity: 1,
      purpose,
      requestDate: new Date().toISOString().split('T')[0],
      borrowDate,
      returnDate,
      status: 'pending' as const,
      approvedBy: '',
      notes: ''
    };

    await Storage.saveRequests([...requests, newRequest]);

    toast({
      title: 'Request Submitted',
      description: `Request for ${selectedAsset.brand} ${selectedAsset.model} sent.`,
    });

    setRequestModalOpen(false);
    setPurpose('');
    setBorrowDate('');
    setReturnDate('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Asset Catalogue</h1>
          <p className="text-muted-foreground">Browse and request available IT equipment.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search assets..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredAssets.map((asset) => (
          <Card key={asset.assetId} className="group hover:shadow-lg transition-all border-none shadow-md overflow-hidden flex flex-col">
            <div className="h-40 bg-muted flex items-center justify-center relative overflow-hidden">
              {asset.imageUrl ? (
                <img src={asset.imageUrl} alt={asset.model} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                getCategoryIcon(asset.category)
              )}
              <div className="absolute top-2 right-2">
                <Badge variant={asset.status === 'available' ? 'default' : 'destructive'}>
                  {asset.status === 'available' ? 'Available' : 'Unavailable'}
                </Badge>
              </div>
            </div>
            <CardHeader className="p-4 space-y-1">
              <div className="flex justify-between items-start">
                <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">{asset.category}</Badge>
              </div>
              <CardTitle className="text-lg font-bold line-clamp-1">{asset.brand} {asset.model}</CardTitle>
              <p className="text-[10px] font-mono text-muted-foreground">TAG: {asset.assetTag}</p>
            </CardHeader>
            <CardContent className="p-4 pt-0 flex-1">
              <p className="text-sm text-muted-foreground line-clamp-2">{asset.description}</p>
            </CardContent>
            <CardFooter className="p-4 border-t bg-muted/20">
              <Button
                className="w-full"
                disabled={asset.status !== 'available'}
                onClick={() => handleOpenRequest(asset)}
              >
                Request Borrow
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {filteredAssets.length === 0 && (
        <div className="text-center py-20 bg-muted/30 rounded-xl border-2 border-dashed">
          <Box className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium text-muted-foreground">No assets found.</p>
        </div>
      )}

      <Dialog open={requestModalOpen} onOpenChange={setRequestModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Request Borrow</DialogTitle>
            <DialogDescription>
              Submit request for <strong>{selectedAsset?.brand} {selectedAsset?.model}</strong> (Tag: {selectedAsset?.assetTag}).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="purpose">Purpose</Label>
              <Textarea
                id="purpose"
                placeholder="Why do you need this?"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="borrow-date">Borrow Date</Label>
                <Input
                  id="borrow-date"
                  type="date"
                  value={borrowDate}
                  onChange={(e) => setBorrowDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="return-date">Return Date</Label>
                <Input
                  id="return-date"
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitRequest} disabled={!purpose || !borrowDate || !returnDate}>Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
