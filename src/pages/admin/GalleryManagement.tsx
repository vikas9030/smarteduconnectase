import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { adminSidebarItems } from '@/config/adminSidebar';
import { BackButton } from '@/components/ui/back-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Plus, FolderOpen, Trash2, Edit, ImageIcon, X, ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface GalleryFolder {
  id: string;
  title: string;
  created_at: string;
}

interface GalleryImage {
  id: string;
  folder_id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
}

export default function GalleryManagement() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [folders, setFolders] = useState<GalleryFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<GalleryFolder | null>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [folderTitle, setFolderTitle] = useState('');
  const [editingFolder, setEditingFolder] = useState<GalleryFolder | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<GalleryImage | null>(null);
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);
  const [editCaption, setEditCaption] = useState('');

  useEffect(() => {
    if (!loading && (!user || userRole !== 'admin')) navigate('/auth');
  }, [user, userRole, loading, navigate]);

  useEffect(() => { fetchFolders(); }, []);

  const fetchFolders = async () => {
    setLoadingData(true);
    const { data } = await supabase.from('gallery_folders').select('*').order('created_at', { ascending: false });
    if (data) setFolders(data);
    setLoadingData(false);
  };

  const fetchImages = async (folderId: string) => {
    const { data } = await supabase.from('gallery_images').select('*').eq('folder_id', folderId).order('created_at', { ascending: false });
    if (data) setImages(data);
  };

  const handleOpenFolder = (folder: GalleryFolder) => {
    setSelectedFolder(folder);
    fetchImages(folder.id);
  };

  const handleCreateOrUpdateFolder = async () => {
    if (!folderTitle.trim()) return;
    if (editingFolder) {
      const { error } = await supabase.from('gallery_folders').update({ title: folderTitle }).eq('id', editingFolder.id);
      if (error) { toast.error('Failed to update folder'); return; }
      toast.success('Folder updated');
    } else {
      const { error } = await supabase.from('gallery_folders').insert({ title: folderTitle, created_by: user?.id });
      if (error) { toast.error('Failed to create folder'); return; }
      toast.success('Folder created');
    }
    setShowFolderDialog(false);
    setFolderTitle('');
    setEditingFolder(null);
    fetchFolders();
  };

  const handleDeleteFolder = async (id: string) => {
    if (!confirm('Delete this folder and all its images?')) return;
    const { error } = await supabase.from('gallery_folders').delete().eq('id', id);
    if (error) { toast.error('Failed to delete folder'); return; }
    toast.success('Folder deleted');
    if (selectedFolder?.id === id) { setSelectedFolder(null); setImages([]); }
    fetchFolders();
  };

  const handleUploadImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedFolder || !e.target.files?.length) return;
    setUploading(true);
    const files = Array.from(e.target.files);
    for (const file of files) {
      const ext = file.name.split('.').pop();
      const path = `${selectedFolder.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('gallery').upload(path, file);
      if (uploadError) { toast.error(`Failed to upload ${file.name}`); continue; }
      const { data: urlData } = supabase.storage.from('gallery').getPublicUrl(path);
      await supabase.from('gallery_images').insert({
        folder_id: selectedFolder.id,
        image_url: urlData.publicUrl,
        caption: file.name.replace(/\.[^/.]+$/, ''),
        created_by: user?.id,
      });
    }
    setUploading(false);
    toast.success('Images uploaded');
    fetchImages(selectedFolder.id);
    e.target.value = '';
  };

  const handleDeleteImage = async (img: GalleryImage) => {
    if (!confirm('Delete this image?')) return;
    const urlParts = img.image_url.split('/gallery/');
    if (urlParts[1]) await supabase.storage.from('gallery').remove([urlParts[1]]);
    await supabase.from('gallery_images').delete().eq('id', img.id);
    toast.success('Image deleted');
    if (selectedFolder) fetchImages(selectedFolder.id);
  };

  const handleEditImage = async () => {
    if (!editingImage) return;
    await supabase.from('gallery_images').update({ caption: editCaption }).eq('id', editingImage.id);
    toast.success('Caption updated');
    setEditingImage(null);
    if (selectedFolder) fetchImages(selectedFolder.id);
  };

  if (loading || loadingData) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <DashboardLayout sidebarItems={adminSidebarItems} roleColor="admin">
      <div className="space-y-6 animate-fade-in">
        <BackButton to="/admin" />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Gallery</h1>
            <p className="text-muted-foreground text-sm">Manage photo folders and images</p>
          </div>
          {!selectedFolder && (
            <Button onClick={() => { setEditingFolder(null); setFolderTitle(''); setShowFolderDialog(true); }}>
              <Plus className="h-4 w-4 mr-1" /> New Folder
            </Button>
          )}
        </div>

        {selectedFolder ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setSelectedFolder(null); setImages([]); }}>
                ← Back to Folders
              </Button>
              <h2 className="text-lg font-semibold">{selectedFolder.title}</h2>
            </div>
            <div>
              <label className="cursor-pointer">
                <Button asChild variant="outline" disabled={uploading}>
                  <span><Plus className="h-4 w-4 mr-1" /> {uploading ? 'Uploading...' : 'Upload Images'}</span>
                </Button>
                <input type="file" multiple accept="image/*" className="hidden" onChange={handleUploadImages} />
              </label>
            </div>
            {images.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground"><ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-30" /><p>No images yet. Upload some!</p></CardContent></Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                {images.map(img => (
                  <Card key={img.id} className="overflow-hidden group relative">
                    <div className="aspect-square relative cursor-pointer" onClick={() => setPreviewImage(img)}>
                      <img src={img.image_url} alt={img.caption || ''} className="w-full h-full object-cover" loading="lazy" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <CardContent className="p-2">
                      <p className="text-xs truncate">{img.caption || 'No caption'}</p>
                      <div className="flex gap-1 mt-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingImage(img); setEditCaption(img.caption || ''); }}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteImage(img)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          folders.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground"><FolderOpen className="h-12 w-12 mx-auto mb-2 opacity-30" /><p>No folders yet. Create one!</p></CardContent></Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {folders.map(f => (
                <Card key={f.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleOpenFolder(f)}>
                  <CardContent className="p-4 flex flex-col items-center gap-2">
                    <FolderOpen className="h-12 w-12 text-primary opacity-60" />
                    <p className="font-medium text-sm text-center">{f.title}</p>
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingFolder(f); setFolderTitle(f.title); setShowFolderDialog(true); }}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteFolder(f.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        )}
      </div>

      {/* Folder Create/Edit Dialog */}
      <Dialog open={showFolderDialog} onOpenChange={setShowFolderDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editingFolder ? 'Edit Folder' : 'New Folder'}</DialogTitle></DialogHeader>
          <Input placeholder="Folder title" value={folderTitle} onChange={e => setFolderTitle(e.target.value)} />
          <DialogFooter><Button onClick={handleCreateOrUpdateFolder}>{editingFolder ? 'Update' : 'Create'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          {previewImage && (() => {
            const currentIndex = images.findIndex(i => i.id === previewImage.id);
            const hasPrev = currentIndex > 0;
            const hasNext = currentIndex < images.length - 1;
            return (
              <div className="relative">
                <img src={previewImage.image_url} alt={previewImage.caption || ''} className="w-full max-h-[80vh] object-contain bg-black" />
                {hasPrev && (
                  <Button variant="ghost" size="icon" className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full h-10 w-10" onClick={() => setPreviewImage(images[currentIndex - 1])}>
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                )}
                {hasNext && (
                  <Button variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full h-10 w-10" onClick={() => setPreviewImage(images[currentIndex + 1])}>
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                )}
                <div className="p-3 flex items-center justify-between">
                  <p className="text-sm">{previewImage.caption || 'No caption'} <span className="text-muted-foreground text-xs ml-1">{currentIndex + 1}/{images.length}</span></p>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => { setEditingImage(previewImage); setEditCaption(previewImage.caption || ''); setPreviewImage(null); }}>
                      <Edit className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { handleDeleteImage(previewImage); setPreviewImage(null); }}>
                      <Trash2 className="h-3 w-3 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Edit Caption Dialog */}
      <Dialog open={!!editingImage} onOpenChange={() => setEditingImage(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit Caption</DialogTitle></DialogHeader>
          <Input placeholder="Caption" value={editCaption} onChange={e => setEditCaption(e.target.value)} />
          <DialogFooter><Button onClick={handleEditImage}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
