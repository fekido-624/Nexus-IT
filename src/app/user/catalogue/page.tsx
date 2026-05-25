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
  const [categories, setCategories] = useState<AssetCategory[]>([]); 
  const [activeCategory, setActiveCategory] = useState('all');      
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
      const [assetData, categoryData] = await Promise.all([
        Storage.getAssets(),
        Storage.getCategories()
      ]);
      setAssets(assetData);
      setCategories(categoryData || []);
    }
    loadData();
  }, []);

// ─── TIKET PENAPISAN KATEGORI & CARIAN (VERSI BRUTAL & KALIS TYPO) ─────────────────────────────
  const filteredAssets = assets.filter(asset => {
    // Fungsi kecilan untuk buang segala jarak, sempang, dan huruf besar/kecil
    const bersihkanString = (str: string) => (str || '').toLowerCase().replace(/[\s_-]/g, '').trim();

    const matchesSearch = 
      asset.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.category.toLowerCase().includes(searchTerm.toLowerCase());
      
    // Padankan kategori menggunakan fungsi pembersihan (Kalis sempang vs jarak)
    const matchesCategory = 
      activeCategory === 'all' || 
      bersihkanString(asset.category) === bersihkanString(activeCategory);

    return matchesSearch && matchesCategory;
  });

  const getCategoryIcon = (category: string) => {
    const catLower = category.toLowerCase();
    if (catLower.includes('laptop')) return <Laptop className="h-12 w-12 text-primary" />;
    if (catLower.includes('monitor')) return <Monitor className="h-12 w-12 text-primary" />;
    if (catLower.includes('keyboard') || catLower.includes('mouse')) return <MousePointer className="h-12 w-12 text-primary" />;
    if (catLower.includes('projector')) return <Projector className="h-12 w-12 text-primary" />;
    if (catLower.includes('printer')) return <Printer className="h-12 w-12 text-primary" />;
    if (catLower.includes('network') || catLower.includes('wifi') || catLower.includes('router')) return <Network className="h-12 w-12 text-primary" />;
    if (catLower.includes('ups') || catLower.includes('power')) return <Power className="h-12 w-12 text-primary" />;
    return <Box className="h-12 w-12 text-primary" />;
  };

  const getCartItem = (assetId: string) => cart.find(c => c.asset.assetId === assetId);
  const isInCart = (assetId: string) => cart.some(c => c.asset.assetId === assetId);
  const totalItems = cart.reduce((sum, c) => sum + c.quantity, 0);

  const addToCart = (asset: Asset) => {
    const existing = getCartItem(asset.assetId);
    if (existing) {
      if (existing.quantity >= asset.availableQty) {
        toast({ variant: "destructive", title: "Kuantiti Maksimum", description: `Hanya tinggal ${asset.availableQty} unit sahaja sedia ada.` });
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
      toast({ variant: "destructive", title: "Kuantiti Maksimum", description: `Hanya tinggal ${asset.availableQty} unit sahaja sedia ada.` });
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
        title: 'Permohonan Berjaya Dihantar',
        description: `Permohonan untuk ${items.length} unit peralatan telah dihantar untuk kelulusan.`,
      });

      setCart([]);
      setCartOpen(false);
      setPurpose('');
      setLocation('');
      setBorrowDate('');
      setReturnDate('');
    } catch (error) {
      console.error("DEBUG ERROR SUBMIT:", error); 
      toast({ variant: "destructive", title: "Ralat", description: "Gagal menghantar permohonan." });
    }
  };

  return (
    <div className="space-y-6 pb-24 md:pb-6"> {/* Ditambah padding bawah untuk elak bertembung dengan Floating FAB mobile */}
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-primary">Asset Catalogue</h1>
          <p className="text-sm text-muted-foreground">Pilih dan pohon peralatan IT sedia ada untuk kegunaan tugasan anda.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari model perkakasan..." className="pl-9 h-11 md:h-10 bg-background shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          {/* Desktop Cart Button (Sembunyi di mobile) */}
          <Button variant="outline" className="hidden md:flex relative gap-2 h-10 border-muted-foreground/20" onClick={() => setCartOpen(true)} disabled={cart.length === 0}>
            <ShoppingCart className="h-4 w-4" />
            <span>Bakul</span>
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {totalItems}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* CATEGORY FILTER PILLS (MOBILE OPTIMIZED SWIPE) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-none md:mx-0 md:px-0 border-b border-muted/40 md:border-none">
        <Button 
          variant={activeCategory === 'all' ? 'default' : 'outline'} 
          size="sm" 
          className={`rounded-full text-xs font-semibold px-4 py-2 transition-all shadow-sm ${activeCategory === 'all' ? '' : 'bg-background border-muted-foreground/20'}`}
          onClick={() => setActiveCategory('all')}
        >
          Semua Peralatan
        </Button>
        {categories.map((cat) => (
          <Button
            key={cat.id}
            variant={activeCategory === cat.slug ? 'default' : 'outline'}
            size="sm"
            className={`rounded-full text-xs font-semibold px-4 py-2 whitespace-nowrap transition-all shadow-sm ${activeCategory === cat.slug ? '' : 'bg-background border-muted-foreground/20'}`}
            onClick={() => setActiveCategory(cat.slug)}
          >
            {cat.name}
          </Button>
        ))}
      </div>

      {/* ASSET CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {filteredAssets.map((asset) => {
          const cartItem = getCartItem(asset.assetId);
          const inCart = isInCart(asset.assetId);
          const unavailable = asset.status !== 'available' || asset.availableQty <= 0;

          return (
            <Card key={asset.assetId} className={`group hover:shadow-xl transition-all border border-muted/60 dark:border-muted/20 shadow-sm rounded-2xl overflow-hidden flex flex-col ${inCart ? 'ring-2 ring-primary border-transparent' : ''}`}>
              <div className="h-44 bg-muted/40 dark:bg-muted/10 flex items-center justify-center relative overflow-hidden border-b border-muted/20">
                {asset.imageUrl ? (
                  <img src={asset.imageUrl} alt={asset.model} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="group-hover:scale-110 transition-transform duration-300">
                    {getCategoryIcon(asset.category)}
                  </div>
                )}
                <div className="absolute top-3 right-3">
                  <Badge className={`shadow-sm border-none font-semibold ${!unavailable ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-destructive'}`}>
                    {!unavailable ? `Sedia Ada (${asset.availableQty})` : 'Habis Pinjam'}
                  </Badge>
                </div>
                {inCart && (
                  <div className="absolute top-3 left-3 bg-primary text-primary-foreground rounded-full p-1 shadow-md scale-110">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                )}
              </div>
              <CardHeader className="p-4 pb-2 space-y-1">
                <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider w-fit rounded-md bg-muted text-muted-foreground">{asset.category}</Badge>
                <CardTitle className="text-lg font-bold line-clamp-1 group-hover:text-primary transition-colors">{asset.brand} {asset.model}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 flex-1">
                <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 leading-relaxed">{asset.description || 'Tiada spesifikasi tambahan diberikan.'}</p>
              </CardContent>
              <CardFooter className="p-4 border-t bg-muted/10">
                {inCart && cartItem ? (
                  /* KAWALAN KUANTITI DI BESARKAN UNTUK MOBILE (THUMB FRIENDLY) */
                  <div className="w-full flex items-center justify-between gap-1 bg-background border rounded-xl p-1 shadow-inner">
                    <Button size="icon" variant="ghost" className="h-10 w-10 md:h-8 md:w-8 rounded-lg text-destructive hover:bg-destructive/10" onClick={() => updateQuantity(asset.assetId, cartItem.quantity - 1)}>
                      <Minus className="h-4 w-4 md:h-3 md:w-3 stroke-[2.5]" />
                    </Button>
                    <span className="flex-1 text-center font-bold text-sm md:text-base text-foreground">{cartItem.quantity} Unit</span>
                    <Button size="icon" variant="ghost" className="h-10 w-10 md:h-8 md:w-8 rounded-lg text-primary hover:bg-primary/10" onClick={() => addToCart(asset)}>
                      <Plus className="h-4 w-4 md:h-3 md:w-3 stroke-[2.5]" />
                    </Button>
                  </div>
                ) : (
                  <Button className="w-full gap-2 h-11 md:h-10 rounded-xl font-semibold shadow-sm text-sm" disabled={unavailable} onClick={() => addToCart(asset)}>
                    <Plus className="h-4 w-4 stroke-[2.5]" /> Tambah ke Bakul
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {filteredAssets.length === 0 && (
        <div className="text-center py-20 bg-muted/20 rounded-2xl border-2 border-dashed border-muted/60">
          <Box className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" />
          <p className="text-base font-semibold text-muted-foreground">Tiada peralatan dijumpai buat masa ini.</p>
        </div>
      )}

      
      {/* 📱 FLOATING PILL CART BAR (MOBILE-ONLY - ANTI TENGGELAM & THUMB FRIENDLY) */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 md:hidden z-[999] animate-in fade-in slide-in-from-bottom-5 duration-300">
          <Button 
            onClick={() => setCartOpen(true)}
            className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold flex items-center justify-between px-4 shadow-[0_8px_30px_rgb(0,0,0,0.16)] active:scale-[0.98] transition-transform border border-primary-foreground/10"
          >
            {/* Bahagian Kiri: Ikon Troli Hub & Info Bilangan Item (Mustahil Kemek) */}
            <div className="flex items-center gap-3">
              <div className="relative bg-primary-foreground/20 p-2 rounded-xl flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-primary-foreground stroke-[2.5]" />
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center shadow-md">
                  {totalItems}
                </span>
              </div>
              <div className="text-left">
                <p className="text-sm font-black tracking-wide">Tengok Bakul</p>
                <p className="text-[10px] font-medium opacity-80">Pohon {totalItems} peralatan</p>
              </div>
            </div>

            {/* Bahagian Kanan: Butang Tindakan */}
            <span className="text-xs font-bold bg-primary-foreground text-primary px-3 py-1.5 rounded-lg shadow-sm">
              Seterusnya →
            </span>
          </Button>
        </div>
      )}

      {/* Cart Dialog */}
      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-lg rounded-2xl p-4 md:p-6 gap-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <ShoppingCart className="h-5 w-5 text-primary" /> Borang Permohonan Pinjaman
            </DialogTitle>
            <DialogDescription>
              Semak senarai kuantiti perkakasan dan lengkapkan butiran maklumat di bawah.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Senarai Item Pilihan ({totalItems} unit)</Label>
              <div className="border border-muted/60 rounded-xl divide-y bg-muted/10 overflow-hidden">
                {cart.map(cartItem => (
                  <div key={cartItem.asset.assetId} className="flex items-center justify-between px-3 py-3 bg-background">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-sm font-bold text-foreground truncate">{cartItem.asset.brand} {cartItem.asset.model}</p>
                      <p className="text-[11px] text-muted-foreground uppercase font-semibold">{cartItem.asset.category}</p>
                    </div>
                    <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-lg border">
                      <Button size="icon" variant="ghost" className="h-7 w-7 rounded-md" onClick={() => updateQuantity(cartItem.asset.assetId, cartItem.quantity - 1)}>
                        <Minus className="h-3 w-3 stroke-[2.5]" />
                      </Button>
                      <span className="text-sm font-bold w-6 text-center">{cartItem.quantity}</span>
                      <Button size="icon" variant="ghost" className="h-7 w-7 rounded-md" onClick={() => addToCart(cartItem.asset)}>
                        <Plus className="h-3 w-3 stroke-[2.5]" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label className="font-semibold text-sm">Tujuan / Alasan Memohon</Label>
              <Textarea placeholder="Nyatakan sebab keperluan peralatan ini (cth: Tugasan audit luar, latihan staf baru...)" value={purpose} onChange={(e) => setPurpose(e.target.value)} className="rounded-xl min-h-[70px]" />
            </div>

            <div className="grid gap-1.5">
              <Label className="font-semibold text-sm">Tempat / Lokasi Digunakan</Label>
              <Input placeholder="Contoh: Bilik Mesyuarat Utama, Tingkat 3" value={location} onChange={(e) => setLocation(e.target.value)} className="rounded-xl h-11 md:h-10" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="font-semibold text-sm">Tarikh Ambil</Label>
                <Input type="date" value={borrowDate} onChange={(e) => setBorrowDate(e.target.value)} className="rounded-xl h-11 md:h-10" />
              </div>
              <div className="grid gap-1.5">
                <Label className="font-semibold text-sm">Tarikh Pulang</Label>
                <Input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} className="rounded-xl h-11 md:h-10" />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 border-t pt-4">
            <Button variant="outline" onClick={() => setCartOpen(false)} className="rounded-xl h-11 md:h-10 font-semibold max-sm:w-full">Batal</Button>
            <Button onClick={handleSubmitRequest} disabled={!purpose || !location || !borrowDate || !returnDate || cart.length === 0} className="rounded-xl h-11 md:h-10 font-bold max-sm:w-full shadow-md">
              Hantar Permohonan ({totalItems} Unit)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}