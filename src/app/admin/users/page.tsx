"use client"

import { useState, useEffect, useRef } from 'react';
import { Storage, User } from '@/lib/storage';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Users, Plus, Pencil, Trash2, Search, ShieldCheck, User as UserIcon, Upload, Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

const BASE_DEPARTMENTS = ['IT', 'Kewangan', 'Pentadbiran', 'HR', 'Operasi', 'Pemasaran'];

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { toast } = useToast();
  
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);
  const isDeletingRef = useRef(false);
  const [isUploadingCsv, setIsUploadingCsv] = useState(false);
  const isUploadingCsvRef = useRef(false);

  // 🔥 STATE BARU: Untuk menguruskan tandaan/pilihan multiple users
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [jawatan, setJawatan] = useState('');

  useEffect(() => {
    async function loadUsers() {
      try {
        const loadedUsers = await Storage.getUsers();
        setUsers(loadedUsers);
      } catch (error) {
        console.error('Failed to load users:', error);
        toast({ variant: "destructive", title: "Ralat", description: "Gagal memuatkan senarai pengguna" });
      }
    }
    loadUsers();
  }, [toast]);

// Tukar u => kepada (u: User)
  const currentDepartments = Array.from(
    new Set([
      ...BASE_DEPARTMENTS,
      ...users.map((u: User) => u.department).filter(Boolean)
    ])
  );

  const filteredUsers = users.filter(u => 
    (u.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.department || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 🔥 FUNGSI BARU: Tandakan / Buang tandaan individu
  const toggleSelectUser = (uid: string) => {
    setSelectedUserIds(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  // 🔥 FUNGSI BARU: Tandakan semua / Buang tandaan semua (Berdasarkan hasil filtered)
  const toggleSelectAll = () => {
    if (filteredUsers.length === 0) return;
    
    // Jika semua yang ditapis dah terpilih, kosongkan balik
    const allFilteredSelected = filteredUsers.every(u => selectedUserIds.includes(u.uid));
    
    if (allFilteredSelected) {
      setSelectedUserIds(prev => prev.filter(id => !filteredUsers.some(f => f.uid === id)));
    } else {
      // Gabungkan pilihan sedia ada dengan semua user dalam filter
      const newSelections = filteredUsers.map(u => u.uid);
      setSelectedUserIds(prev => Array.from(new Set([...prev, ...newSelections])));
    }
  };

  const handleSave = async () => {
    if (!name || !email || !department || isSavingRef.current) return;

    isSavingRef.current = true;
    setIsSaving(true);
    try {
      const currentUsers = await Storage.getUsers();
      
      if (editingUser) {
        const updated = currentUsers.map(u => {
          if (u.uid !== editingUser.uid) return u;
          const updatedUser: User = {
            ...u,
            name,
            email,
            department,
            jawatan,
            role
          };
          if (password) {
            updatedUser.password = password;
          }
          return updatedUser;
        });
        await Storage.saveUsers(updated);
        setUsers(updated);
        toast({ title: "Pengguna Dikemaskini", description: `Akaun untuk ${name} telah dikemas kini.` });
      } else {
        const newUser: User = {
          uid: `u-${Date.now()}`,
          name,
          email,
          password: password || 'user123',
          department,
          jawatan,  
          role
        };
        const updated = [...currentUsers, newUser];
        await Storage.saveUsers(updated);
        setUsers(updated);
        toast({ title: "Pengguna Dicipta", description: `Akaun baru dicipta untuk ${name}.` });
      }

      resetForm();
    } catch (error) {
      console.error('Failed to save user:', error);
      toast({ variant: "destructive", title: "Ralat", description: "Gagal menyimpan pengguna" });
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setDepartment('');
    setRole('user');
    setEditingUser(null);
    setIsDialogOpen(false);
    setJawatan('');
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setName(user.name || '');
    setEmail(user.email || '');
    setPassword('');
    setDepartment(user.department || '');
    setRole(user.role || 'user');
    setJawatan(user.jawatan || '');
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (isDeletingRef.current) return;
    isDeletingRef.current = true;
    try {
      const requests = await Storage.getRequests();
      const hasActive = requests.some(r =>
        r.userId === deleteTargetId &&
        (r.status === 'approved' || r.status === 'pending' || r.status === 'returning')
      );
      if (hasActive) {
        toast({ variant: "destructive", title: "Tidak Boleh Dipadam", description: "Pengguna ini masih mempunyai permohonan pinjaman aktif atau tertunggu." });
        return;
      }
      const currentUsers = await Storage.getUsers();
      const updated = currentUsers.filter(u => u.uid !== deleteTargetId);
      await Storage.saveUsers(updated);
      setUsers(updated);
      setSelectedUserIds(prev => prev.filter(id => id !== deleteTargetId)); // bersihkan dari senarai select jika ada
      toast({ variant: "destructive", title: "Pengguna Dipadam", description: "Akaun pengguna telah dibuang." });
    } catch (error) {
      toast({ variant: "destructive", title: "Ralat", description: "Gagal memadam pengguna" });
    } finally {
      isDeletingRef.current = false;
      setConfirmOpen(false);
      setDeleteTargetId('');
    }
  };

  // 🔥 FUNGSI BARU: PROSES PADAM SECARA PUKAL (BULK DELETE)
  const handleBulkDelete = async () => {
    if (isDeletingRef.current) return;
    isDeletingRef.current = true;
    try {
      const requests = await Storage.getRequests();
      
      // Semak jika ada mana-mana user terpilih mempunyai request aktif
      const hasActive = requests.some(r =>
        selectedUserIds.includes(r.userId) &&
        (r.status === 'approved' || r.status === 'pending' || r.status === 'returning')
      );

      if (hasActive) {
        toast({
          variant: "destructive",
          title: "Tidak Boleh Dipadam Pukal",
          description: "Satu atau lebih pengguna terpilih masih mempunyai permohonan pinjaman aktif atau tertunggu."
        });
        return;
      }

      const currentUsers = await Storage.getUsers();
      // Singkirkan semua user terpilih dari database
      const updated = currentUsers.filter(u => !selectedUserIds.includes(u.uid));

      await Storage.saveUsers(updated);
      setUsers(updated);
      setSelectedUserIds([]); // Setel padam, kosongkan balik tong pilihan

      toast({ variant: "destructive", title: "Pengguna Dipadam", description: "Akaun pengguna terpilih telah berjaya dibuang." });
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Ralat", description: "Gagal menjalankan pemadaman pukal." });
    } finally {
      isDeletingRef.current = false;
      setBulkConfirmOpen(false);
    }
  };

  const downloadTemplate = () => {
    const headers = "uid,name,email,password,department,jawatan,role\n";
    const sampleData = "u101,Ahmad Ali,ahmad@domain.com,user123,Codex,Pegawai IT,user\n";
    const blob = new Blob([headers + sampleData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "template_users.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isUploadingCsvRef.current) return;

    isUploadingCsvRef.current = true;
    setIsUploadingCsv(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

        if (lines.length <= 1) {
          toast({ variant: "destructive", title: "Ralat", description: "Fail CSV kosong atau tiada data!" });
          return;
        }

        const bersihkanTeks = (str: string) => str.trim().replace(/^["']|["']$/g, '').trim();
        
        // 🎯 FIX TS: Letak jenis (h: string)
        const headers = lines[0].split(',').map((h: string) => bersihkanTeks(h).toLowerCase());

        // 🎯 FIX TS: Letak jenis (h: string)
        const nameIdx = headers.findIndex((h: string) => h.includes('name') || h.includes('nama'));
        const emailIdx = headers.findIndex((h: string) => h.includes('email') || h.includes('mel'));
        const passwordIdx = headers.findIndex((h: string) => h.includes('password') || h.includes('kata laluan'));
        const roleIdx = headers.findIndex((h: string) => h.includes('role') || h.includes('akses') || h.includes('peranan'));
        const uidIdx = headers.findIndex((h: string) => h.includes('uid') || h.includes('id'));
        
        const deptIdx = headers.findIndex((h: string) => 
          h.includes('department') || h.includes('dept') || h.includes('bahagian') || (h.includes('jabatan') && !h.includes('jawatan'))
        );
        const jawatanIdx = headers.findIndex((h: string) => h.includes('jawatan') || h.includes('position'));

        const newUsers: User[] = [];

        for (let i = 1; i < lines.length; i++) {
          // 🎯 FIX TS: Letak jenis (v: string)
          const values = lines[i].split(',').map((v: string) => bersihkanTeks(v));
          if (values.length !== headers.length) continue;

          const userMap: any = {};
          // 🎯 FIX TS: Letak jenis (header: string, index: number)
          headers.forEach((header: string, index: number) => {
            userMap[header] = values[index];
          });

          const nameTarget = nameIdx !== -1 ? values[nameIdx] : '';
          const emailTarget = emailIdx !== -1 ? values[emailIdx] : '';
          const passwordTarget = passwordIdx !== -1 ? values[passwordIdx] : 'user123';
          const deptTarget = deptIdx !== -1 ? values[deptIdx] : 'IT';
          const jawatanTarget = jawatanIdx !== -1 ? values[jawatanIdx] : '';
          const roleTarget = roleIdx !== -1 ? values[roleIdx] : 'user';
          const uidTarget = uidIdx !== -1 ? values[uidIdx] : `u-${Date.now()}-${i}`;

          const user: User = {
            uid: uidTarget,
            name: nameTarget,
            email: emailTarget,
            password: passwordTarget,
            department: deptTarget, 
            jawatan: jawatanTarget,
            role: (roleTarget === 'admin' || roleTarget === 'user') ? roleTarget : 'user'
          };

          if (user.name && user.email) {
            newUsers.push(user);
          }
        }

        if (newUsers.length === 0) {
          toast({ variant: "destructive", title: "Ralat", description: "Tiada data pengguna sah dijumpai." });
          return;
        }

        const currentUsers = await Storage.getUsers();
        
        // 🎯 FIX TS: Letak jenis (oldUser: User) dan (newUser: User)
        const filteredOldUsers = currentUsers.filter((oldUser: User) => 
          !newUsers.some((newUser: User) => newUser.uid === oldUser.uid || newUser.email === oldUser.email)
        );
        
        const updatedUsers = [...filteredOldUsers, ...newUsers];
        await Storage.saveUsers(updatedUsers);
        setUsers(updatedUsers); 
        
        toast({ title: "Berjaya!", description: `${newUsers.length} data pengguna telah dikemas kini secara pukal.` });
      } catch (error) {
        toast({ variant: "destructive", title: "Ralat", description: "Gagal memproses fail CSV." });
      } finally {
        isUploadingCsvRef.current = false;
        setIsUploadingCsv(false);
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Pengurusan Pengguna</h1>
          <p className="text-muted-foreground">Urus akses staf dan penetapan jabatan.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={downloadTemplate}>
            <Download className="h-4 w-4" /> Templat CSV
          </Button>

          <Button variant="secondary" className="gap-2" disabled={isUploadingCsv} asChild>
            <label className={isUploadingCsv ? "pointer-events-none opacity-50" : "cursor-pointer"}>
              {isUploadingCsv ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {isUploadingCsv ? 'Memuat naik...' : 'Import CSV'}
              <input
                type="file"
                accept=".csv"
                className="hidden"
                disabled={isUploadingCsv}
                onChange={handleFileUpload}
              />
            </label>
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={(open) => { if(!open) resetForm(); setIsDialogOpen(open); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Tambah Pengguna Baru
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingUser ? 'Edit Akaun Pengguna' : 'Cipta Akaun Pengguna Baru'}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nama Penuh</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="cth. Ahmad Fauzi" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Alamat Emel</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="emel@gov.my" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Kata Laluan {editingUser && '(Biarkan kosong untuk kekalkan yang sedia ada)'}</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={editingUser ? "••••••••" : "user123"} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="dept">Jabatan</Label>
                    <Select value={department} onValueChange={setDepartment}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih jabatan" />
                      </SelectTrigger>
                      <SelectContent>
                        {currentDepartments.map(dept => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="role">Peranan Sistem</Label>
                    <Select value={role} onValueChange={(val: any) => setRole(val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih peranan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Staf (Pengguna)</SelectItem>
                        <SelectItem value="admin">Pentadbir</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Jawatan</Label>
                    <Input
                      value={jawatan}
                      onChange={(e) => setJawatan(e.target.value)}
                      placeholder="Pegawai IT, Pembantu Tadbir, dll"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetForm} disabled={isSaving}>Batal</Button>
                <Button onClick={handleSave} disabled={!name || !email || !department || isSaving} className="gap-2">
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isSaving ? 'Menyimpan...' : (editingUser ? 'Kemaskini Akaun' : 'Cipta Akaun')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="shadow-md">
        <CardHeader className="pb-3">
          {/* 🔥 SEKSYEN ATAS JADUAL: Carian + Butang Padam Pukal */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari mengikut nama, emel atau jabatan..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Muncul butang padam pukal hanya jika ada user yang di-tick */}
            {selectedUserIds.length > 0 && (
              <Button
                variant="destructive"
                className="gap-2 animate-in fade-in slide-in-from-top-1"
                onClick={() => setBulkConfirmOpen(true)}
              >
                <Trash2 className="h-4 w-4" /> Padam Terpilih ({selectedUserIds.length})
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                {/* 🔥 HEADER BARU: Kotak Pilihan Select All */}
                <TableHead className="w-[50px] text-center pl-4">
                  <input 
                    type="checkbox" 
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer accent-primary"
                    checked={filteredUsers.length > 0 && filteredUsers.every(u => selectedUserIds.includes(u.uid))}
                    onChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Butiran Pengguna</TableHead>
                <TableHead>Jabatan</TableHead>
                <TableHead>Peranan</TableHead>
                <TableHead className="text-right pr-4">Tindakan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    Tiada pengguna dijumpai.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  /* ✨ Tukar warna background row sedikit kalau user tu ditanda */
                  <TableRow key={user.uid} className={selectedUserIds.includes(user.uid) ? "bg-primary/5 hover:bg-primary/5" : ""}>
                    
                    {/* 🔥 KOLUM BARU: Kotak Pilihan Individu */}
                    <TableCell className="text-center pl-4">
                      <input 
                        type="checkbox" 
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer accent-primary"
                        checked={selectedUserIds.includes(user.uid)}
                        onChange={() => toggleSelectUser(user.uid)}
                      />
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-full">
                          <UserIcon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.department}</Badge>
                    </TableCell>
                    <TableCell>
                      {user.role === 'admin' ? (
                        <Badge className="bg-accent flex items-center gap-1 w-fit">
                          <ShieldCheck className="h-3 w-3" /> Admin
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Staf</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(user)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => { setDeleteTargetId(user.uid); setConfirmOpen(true); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Dialog Konfirmasi Single Delete */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Padam Pengguna?"
        description="Tindakan ini akan membuang akaun pengguna secara kekal. Tindakan ini tidak boleh diundur."
        onConfirm={handleDelete}
      />

      {/* 🔥 DIALOG KONFIRMASI BARU: Bulk Delete */}
      <ConfirmDialog
        open={bulkConfirmOpen}
        onOpenChange={setBulkConfirmOpen}
        title={`Padam ${selectedUserIds.length} Pengguna?`}
        description={`Tindakan ini akan membuang kesemua ${selectedUserIds.length} akaun pengguna terpilih secara kekal. Tindakan ini tidak boleh diundur.`}
        onConfirm={handleBulkDelete}
      />
    </div>
  );
}