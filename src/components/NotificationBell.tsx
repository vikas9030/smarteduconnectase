import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Bell, Clock, FileText, Award, CheckCircle, CalendarCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setNotifications(data);
  };

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    if (!user) return;
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const handleClick = (n: Notification) => {
    if (!n.is_read) markAsRead(n.id);
    if (n.link) {
      setOpen(false);
      navigate(n.link);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'leave': return <Clock className="h-4 w-4 text-orange-500" />;
      case 'certificate': return <Award className="h-4 w-4 text-blue-500" />;
      case 'attendance': return <CalendarCheck className="h-4 w-4 text-green-500" />;
      case 'result': return <FileText className="h-4 w-4 text-purple-500" />;
      default: return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const timeAgo = (dateStr: string) => {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-destructive text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="font-semibold text-sm">Notifications</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllRead}>
              <CheckCircle className="h-3 w-3 mr-1" /> Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
              No notifications yet
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={cn(
                    "w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex gap-3",
                    !n.is_read && "bg-primary/5"
                  )}
                >
                  <div className="mt-0.5 shrink-0">{getIcon(n.type)}</div>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm", !n.is_read && "font-semibold")}>{n.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.is_read && <div className="mt-2 w-2 h-2 rounded-full bg-primary shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
