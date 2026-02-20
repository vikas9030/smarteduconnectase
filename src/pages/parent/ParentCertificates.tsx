import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, Award, Plus, Clock, CheckCircle2, XCircle, FileText, Paperclip } from 'lucide-react';
import { parentSidebarItems } from '@/config/parentSidebar';
import { useToast } from '@/hooks/use-toast';

interface CertificateRequest {
  id: string;
  certificate_type: string;
  status: string;
  created_at: string;
  attachment_url: string | null;
}

const CERTIFICATE_TYPES = [
  'Bonafide Certificate',
  'Transfer Certificate',
  'Character Certificate',
  'Study Certificate',
  'Migration Certificate',
  'Conduct Certificate',
];

export default function ParentCertificates() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [requests, setRequests] = useState<CertificateRequest[]>([]);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [childName, setChildName] = useState('');
  const [loadingData, setLoadingData] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  useEffect(() => {
    if (!loading && (!user || userRole !== 'parent')) {
      navigate('/auth');
    }
  }, [user, userRole, loading, navigate]);

  useEffect(() => {
    fetchData();
  }, [user]);

  async function fetchData() {
    if (!user) return;
    setLoadingData(true);

    const { data: parentData } = await supabase
      .from('parents')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (parentData) {
      const { data: links } = await supabase
        .from('student_parents')
        .select('student_id, students(full_name)')
        .eq('parent_id', parentData.id);

      if (links && links.length > 0) {
        const sid = links[0].student_id;
        setStudentId(sid);
        setChildName((links[0] as any).students?.full_name || '');

        const { data: requestsData } = await supabase
          .from('certificate_requests')
          .select('*')
          .eq('student_id', sid)
          .order('created_at', { ascending: false });

        if (requestsData) setRequests(requestsData as CertificateRequest[]);
      }
    }
    setLoadingData(false);
  }

  const handleSubmit = async () => {
    if (!studentId || !selectedType || !user) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a certificate type' });
      return;
    }

    setIsSubmitting(true);
    let attachmentUrl: string | null = null;

    if (attachmentFile) {
      const fileExt = attachmentFile.name.split('.').pop();
      const filePath = `certificate-docs/${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('photos').upload(filePath, attachmentFile);
      if (uploadError) {
        toast({ variant: 'destructive', title: 'Upload Error', description: uploadError.message });
        setIsSubmitting(false);
        return;
      }
      const { data: urlData } = supabase.storage.from('photos').getPublicUrl(filePath);
      attachmentUrl = urlData.publicUrl;
    }

    const { error } = await supabase.from('certificate_requests').insert({
      student_id: studentId,
      certificate_type: selectedType,
      requested_by: user.id,
      attachment_url: attachmentUrl,
    });

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Success', description: 'Certificate request submitted successfully' });
      setDialogOpen(false);
      setSelectedType('');
      setAttachmentFile(null);
      fetchData();
    }
    setIsSubmitting(false);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'approved': return { icon: <CheckCircle2 className="h-4 w-4" />, class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
      case 'rejected': return { icon: <XCircle className="h-4 w-4" />, class: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
      default: return { icon: <Clock className="h-4 w-4" />, class: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' };
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const isLoadingContent = loadingData;

  return (
    <DashboardLayout sidebarItems={parentSidebarItems} roleColor="parent">
      {isLoadingContent ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Certificates</h1>
            <p className="text-muted-foreground">Request and track certificates for {childName}</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-parent"><Plus className="h-4 w-4 mr-2" />Request Certificate</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">Request Certificate</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Certificate Type</Label>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger><SelectValue placeholder="Select certificate type" /></SelectTrigger>
                    <SelectContent>
                      {CERTIFICATE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Attachment (Optional)</Label>
                  <Input type="file" accept="image/*,.pdf,.doc,.docx" onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)} />
                  <p className="text-xs text-muted-foreground">Upload a supporting document or image (optional)</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Certificate requests are typically processed within 3-5 working days.
                </p>
              </div>
              <DialogFooter>
                <Button onClick={handleSubmit} disabled={isSubmitting || !selectedType} className="w-full gradient-parent">
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Submit Request
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {requests.length === 0 ? (
          <Card className="card-elevated">
            <CardContent className="py-12 text-center">
              <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No certificate requests yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {requests.map((request) => {
              const style = getStatusStyle(request.status);
              return (
                <Card key={request.id} className="card-elevated">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">{request.certificate_type}</p>
                          <p className="text-sm text-muted-foreground">
                            Requested: {new Date(request.created_at).toLocaleDateString()}
                          </p>
                          {request.attachment_url && (
                            <a href={request.attachment_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1">
                              <Paperclip className="h-3 w-3" /> View Attachment
                            </a>
                          )}
                        </div>
                      </div>
                      <Badge className={`${style.class} flex items-center gap-1`}>
                        {style.icon}
                        {request.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      )}
    </DashboardLayout>
  );
}
