"use client"

import { useState, useEffect } from 'react';
import { Storage, Asset, AssetCategory } from '@/lib/storage';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, Laptop, Monitor, MousePointer, Projector, Printer, Network, Power, Box, ShoppingCart, X, Plus, Check, Minus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

interface CartItem {
  asset: Asset;
  quantity: number;
}

export default function AssetCatalogue() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]); // STATE BARU: Simpan data kategori dari DB
  const [activeCategory, setActiveCategory] = useState('all');       // STATE BARU: Simpan kategori terpilih
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const [purpose, setPurpose] = useState('');
  const [location, setLocation] = useState(''); 
  const [borrowDate, setBorrowDate] = useState('');
  const [returnDate, setReturnDate] = useState('');

  useEffect(() => {
    async function loadData() {
      await Storage.init();
      // Ambil data aset dan kategori secara serentak (Parallel fetching)
      const [assetData, categoryData] = await Promise.all([
        Storage.getAssets(),
        Storage.getCategories()
      ]);
      setAssets(assetData);
      setCategories(categoryData || []);
    }
    loadData();
  }, []);

  // ─── TIKET PENAPISAN KATEGORI & CARIAN ─────────────────────────────
  const filteredAssets = assets.filter(asset => {
    const matchesSearch = 
      asset.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.category.toLowerCase().includes(searchTerm.toLowerCase());
      
    // Penapisan kategori dinamik mengikut pilihan user
    const matchesCategory = 
      activeCategory === 'all' || 
      asset.category.toLowerCase() === activeCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  const getCategoryIcon = (category: string) => {
    const catLower = category.toLowerCase();
    if (catLower.includes('laptop')) return <Laptop className="h-10 w-10 text-primary" />;
    if (catLower.includes('monitor')) return <Monitor className="h-10 w-10 text-primary" />;
    if (catLower.includes('keyboard') || catLower.includes('mouse')) return <MousePointer className="h-10 w-10 text-primary" />;
    if (catLower.includes('projector')) return <Projector className="h-10 w-10 text-primary" />;
    if (catLower.includes('printer')) return <Printer className="h-10 w-10 text-primary" />;
    if (catLower.includes('network') || catLower.includes('wifi') || catLower.includes('router')) return <Network className="h-10 w-10 text-primary" />;
    if (catLower.includes('ups') || catLower.includes('power')) return <Power className="h-10 w-10 text-primary" />;
    return <Box className="h-10 w-10 text-primary" />;
  };

  const getCartItem = (assetId: string) => cart.find(c => c.asset.assetId === assetId);
  const isInCart = (assetId: string) => cart.some(c => c.asset.assetId === assetId);
  const totalItems = cart.reduce((sum, c) => sum + c.quantity, 0);

  const addToCart = (asset: Asset) => {
    const existing = getCartItem(asset.assetId);
    if (existing) {
      if (existing.quantity >= asset.availableQty) {
        toast({ variant: "destructive", title: "Max quantity reached", description: `Only ${asset.availableQty} unit(s) available.` });
        return;
      }
      setCart(cart.map(c => c.asset.assetId === asset.assetId ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { asset, quantity: 1 }]);
    }
  };

  const removeFromCart = (assetId: string) => {
    setCart(cart.filter(c => c.asset.assetId !== assetId));
  };

  const updateQuantity = (assetId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(assetId);
      return;
    }
    const asset = assets.find(a => a.assetId === assetId);
    if (asset && qty > asset.availableQty) {
      toast({ variant: "destructive", title: "Max quantity reached", description: `Only ${asset.availableQty} unit(s) available.` });
      return;
    }
    setCart(cart.map(c => c.asset.assetId === assetId ? { ...c, quantity: qty } : c));
  };

  const handleSubmitRequest = async () => {
    if (!user || cart.length === 0 || !purpose || !location || !borrowDate || !returnDate) return;

    try {
      const requests = (await Storage.getRequests()) || []; 
      const requestId = `REQ-${Date.now()}`;

      const items: any[] = [];
      cart.forEach((cartItem, index) => {
        for (let q = 0; q < cartItem.quantity; q++) {
          items.push({
            itemId: `ITEM-${Date.now()}-${cartItem.asset.assetId}-${index}-${q}`,
            requestId,
            assetId: cartItem.asset.assetId,
            assetName: `${cartItem.asset.brand} ${cartItem.asset.model}`,
            assignedUnitId: '',
            assignedAssetTag: '',
            assignedSerialNumber: '',
            status: 'pending',
            notes: ''
          });
        }
      });

      const newRequest: any = {
        requestId,
        userId: user.uid,
        userName: user.name,
        userDept: user.department || '', 
        purpose,
        location: location, 
        requestDate: new Date().toISOString().split('T')[0],
        borrowDate,
        returnDate,
        status: 'pending',
        approvedBy: '',
        notes: '',
        items
      };

      await Storage.saveRequests([...requests, newRequest]);

      toast({
        title: 'Request Submitted',
        description: `Request for ${items.length} unit(s) has been submitted.`,
      });

      setCart([]);
      setCartOpen(false);
      setPurpose('');
      setLocation('');
      setBorrowDate('');
      setReturnDate('');
    } catch (error) {
      console.error("DEBUG ERROR SUBMIT:", error); 
      toast({ variant: "destructive", title: "Error", description: "Failed to submit request. Check console!" });
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Asset Catalogue</h1>
          <p className="text-muted-foreground">Browse and request available IT equipment.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search assets..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <Button variant="outline" className="relative gap-2" onClick={() => setCartOpen(true)} disabled={cart.length === 0}>
            <ShoppingCart className="h-4 w-4" />
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {totalItems}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* ─── BARU: RUANGAN FILTERS CATEGORY BADGES (MOBILE FRIENDLY SCROLLABLE) ─── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide md:mx-0 md:px-0">
        <Button 
          variant={activeCategory === 'all' ? 'default' : 'outline'} 
          size="sm" 
          className="rounded-full text-xs font-medium"
          onClick={() => setActiveCategory('all')}
        >
          All Equipment
        </Button>
        {categories.map((cat) => (
          <Button
            key={cat.id}
            variant={activeCategory === cat.slug ? 'default' : 'outline'}
            size="sm"
            className="rounded-full text-xs font-medium whitespace-nowrap"
            onClick={() => setActiveCategory(cat.slug)}
          >
            {cat.name}
          </Button>
        ))}
      </div>

      {/* ASSET CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredAssets.map((asset) => {
          const cartItem = getCartItem(asset.assetId);
          const inCart = isInCart(asset.assetId);
          const unavailable = asset.status !== 'available' || asset.availableQty <= 0;

          return (
            <Card key={asset.assetId} className={`group hover:shadow-lg transition-all border-none shadow-md overflow-hidden flex flex-col ${inCart ? 'ring-2 ring-primary' : ''}`}>
              <div className="h-40 bg-muted flex items-center justify-center relative overflow-hidden">
                {asset.imageUrl ? (
                  <img src={asset.imageUrl} alt={asset.model} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  getCategoryIcon(asset.category)
                )}
                <div className="absolute top-2 right-2">
                  <Badge variant={!unavailable ? 'default' : 'destructive'}>
                    {!unavailable ? `Available (${asset.availableQty})` : 'Unavailable'}
                  </Badge>
                </div>
                {inCart && (
                  <div className="absolute top-2 left-2 bg-primary text-primary-foreground rounded-full p-1">
                    <Check className="h-3 w-3" />
                  </div>
                )}
              </div>
              <CardHeader className="p-4 space-y-1">
                <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider w-fit">{asset.category}</Badge>
                <CardTitle className="text-lg font-bold line-clamp-1">{asset.brand} {asset.model}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 flex-1">
                <p className="text-sm text-muted-foreground line-clamp-2">{asset.description}</p>
              </CardContent>
              <CardFooter className="p-4 border-t bg-muted/20">
                {inCart && cartItem ? (
                  <div className="w-full flex items-center gap-2">
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQuantity(asset.assetId, cartItem.quantity - 1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="flex-1 text-center font-medium text-sm">{cartItem.quantity}</span>
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => addToCart(asset)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => removeFromCart(asset.assetId)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Button className="w-full gap-2" disabled={unavailable} onClick={() => addToCart(asset)}>
                    <Plus className="h-4 w-4" /> Add to Cart
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {filteredAssets.length === 0 && (
        <div className="text-center py-20 bg-muted/30 rounded-xl border-2 border-dashed">
          <Box className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium text-muted-foreground">No assets found in this category.</p>
        </div>
      )}

      {/* Cart Dialog */}
      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-lg rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" /> Borrow Request
            </DialogTitle>
            <DialogDescription>
              Review your selected assets and fill in the details.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase">Selected Assets ({totalItems} unit(s))</Label>
              <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                {cart.map(cartItem => (
                  <div key={cartItem.asset.assetId} className="flex items-center justify-between px-3 py-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{cartItem.asset.brand} {cartItem.asset.model}</p>
                      <p className="text-[10px] text-muted-foreground">{cartItem.asset.category}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQuantity(cartItem.asset.assetId, cartItem.quantity - 1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-sm font-medium w-6 text-center">{cartItem.quantity}</span>
                      <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => addToCart(cartItem.asset)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeFromCart(cartItem.asset.assetId)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Purpose / Tujuan</Label>
              <Textarea placeholder="Why do you need this equipment?" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label>Tempat Digunakan</Label>
              <Input placeholder="Contoh: Bilik Mesyuarat Utama" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Borrow Date</Label>
                <Input type="date" value={borrowDate} onChange={(e) => setBorrowDate(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Return Date</Label>
                <Input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCartOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitRequest} disabled={!purpose || !location || !borrowDate || !returnDate || cart.length === 0}>
              Submit Request ({totalItems} unit(s))
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}