import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, Eye } from 'lucide-react';

export interface ReceiptTemplate {
  schoolName: string;
  schoolAddress: string;
  schoolPhone: string;
  headerTitle: string;
  footerText: string;
  showAdmissionNumber: boolean;
  showClass: boolean;
  showDiscount: boolean;
  showLogo: boolean;
  logoUrl: string;
}

export const defaultTemplate: ReceiptTemplate = {
  schoolName: '',
  schoolAddress: '',
  schoolPhone: '',
  headerTitle: 'FEE RECEIPT',
  footerText: 'This is a computer-generated receipt.',
  showAdmissionNumber: true,
  showClass: true,
  showDiscount: true,
  showLogo: false,
  logoUrl: '',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export async function loadReceiptTemplate(): Promise<ReceiptTemplate> {
  const { data } = await supabase
    .from('app_settings')
    .select('setting_value')
    .eq('setting_key', 'receipt_template')
    .maybeSingle();
  if (data?.setting_value && typeof data.setting_value === 'object') {
    return { ...defaultTemplate, ...(data.setting_value as Record<string, any>) };
  }
  return defaultTemplate;
}

export default function ReceiptTemplateSettings({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const [template, setTemplate] = useState<ReceiptTemplate>(defaultTemplate);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      loadReceiptTemplate().then(t => { setTemplate(t); setLoading(false); });
    }
  }, [open]);

  const update = (key: keyof ReceiptTemplate, value: any) => {
    setTemplate(prev => ({ ...prev, [key]: value }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `receipt-logos/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('photos').upload(path, file, { upsert: true });
    if (error) {
      toast({ variant: 'destructive', title: 'Upload failed', description: error.message });
    } else {
      const { data: urlData } = supabase.storage.from('photos').getPublicUrl(path);
      update('logoUrl', urlData.publicUrl);
      update('showLogo', true);
    }
    setUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { data: existing } = await supabase
      .from('app_settings')
      .select('id')
      .eq('setting_key', 'receipt_template')
      .maybeSingle();

    let error;
    if (existing) {
      ({ error } = await supabase
        .from('app_settings')
        .update({ setting_value: template as any, updated_at: new Date().toISOString() })
        .eq('setting_key', 'receipt_template'));
    } else {
      ({ error } = await supabase
        .from('app_settings')
        .insert({ setting_key: 'receipt_template', setting_value: template as any }));
    }

    setSaving(false);
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Saved', description: 'Receipt template updated successfully' });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Receipt Template Settings</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-6">
            {/* School Info */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">School Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="schoolName">School Name</Label>
                  <Input id="schoolName" value={template.schoolName} onChange={e => update('schoolName', e.target.value)} placeholder="e.g. ASE School" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="schoolPhone">Phone</Label>
                  <Input id="schoolPhone" value={template.schoolPhone} onChange={e => update('schoolPhone', e.target.value)} placeholder="+91..." />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="schoolAddress">Address</Label>
                <Input id="schoolAddress" value={template.schoolAddress} onChange={e => update('schoolAddress', e.target.value)} placeholder="Full address" />
              </div>
            </div>

            <Separator />

            {/* Header / Footer */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Header & Footer</h3>
              <div className="space-y-1">
                <Label htmlFor="headerTitle">Header Title</Label>
                <Input id="headerTitle" value={template.headerTitle} onChange={e => update('headerTitle', e.target.value)} placeholder="FEE RECEIPT" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="footerText">Footer Text</Label>
                <Textarea id="footerText" value={template.footerText} onChange={e => update('footerText', e.target.value)} rows={2} placeholder="Footer note..." />
              </div>
            </div>

            <Separator />

            {/* Logo */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Logo</h3>
              <div className="flex items-center justify-between">
                <Label>Show Logo on Receipt</Label>
                <Switch checked={template.showLogo} onCheckedChange={v => update('showLogo', v)} />
              </div>
              {template.showLogo && (
                <div className="flex items-center gap-4">
                  {template.logoUrl && <img src={template.logoUrl} alt="Logo" className="h-12 w-12 rounded object-contain border" />}
                  <Label htmlFor="logoUpload" className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm hover:bg-muted transition-colors">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {template.logoUrl ? 'Change Logo' : 'Upload Logo'}
                  </Label>
                  <input id="logoUpload" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </div>
              )}
            </div>

            <Separator />

            {/* Field Toggles */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Visible Fields</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Admission Number</Label>
                  <Switch checked={template.showAdmissionNumber} onCheckedChange={v => update('showAdmissionNumber', v)} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Class</Label>
                  <Switch checked={template.showClass} onCheckedChange={v => update('showClass', v)} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Discount Column</Label>
                  <Switch checked={template.showDiscount} onCheckedChange={v => update('showDiscount', v)} />
                </div>
              </div>
            </div>

            <Separator />

            {/* Preview */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2"><Eye className="h-4 w-4" /> Preview</h3>
              <div className="border rounded-lg p-4 bg-background text-sm space-y-3">
                <div className="text-center space-y-1">
                  {template.showLogo && template.logoUrl && (
                    <img src={template.logoUrl} alt="Logo" className="h-10 w-10 mx-auto rounded object-contain" />
                  )}
                  {template.schoolName && <p className="font-bold text-base">{template.schoolName}</p>}
                  {template.schoolAddress && <p className="text-xs text-muted-foreground">{template.schoolAddress}</p>}
                  {template.schoolPhone && <p className="text-xs text-muted-foreground">Ph: {template.schoolPhone}</p>}
                  <p className="font-semibold tracking-wide border-b pb-2">{template.headerTitle || 'FEE RECEIPT'}</p>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <p>Receipt No: <span className="font-mono">RCP12345678</span></p>
                  <p className="text-right">Date: {new Date().toLocaleDateString()}</p>
                  <p>Student: <strong>Sample Student</strong></p>
                  {template.showAdmissionNumber && <p>Admission No: <span className="font-mono">ADM001</span></p>}
                  {template.showClass && <p>Class: 10-A</p>}
                </div>
                <div className="border rounded text-xs">
                  <div className="grid grid-cols-4 font-semibold bg-muted p-1.5">
                    <span>Fee Type</span><span>Amount</span>
                    {template.showDiscount && <span>Discount</span>}
                    <span>Paid</span>
                  </div>
                  <div className="grid grid-cols-4 p-1.5">
                    <span>Tuition</span><span>₹10,000</span>
                    {template.showDiscount && <span>₹500</span>}
                    <span>₹9,500</span>
                  </div>
                </div>
                {template.footerText && (
                  <p className="text-xs text-center text-muted-foreground italic">{template.footerText}</p>
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
