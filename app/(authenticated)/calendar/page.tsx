'use client';

import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, Clock, MapPin, Trash2, CheckCircle2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type CalendarEvent = {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  location?: string;
  isCompleted: boolean;
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  
  // New Event Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTime, setNewTime] = useState('12:00');
  const [newLocation, setNewLocation] = useState('');

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Padded days for the grid (to start on correct weekday)
  const startDayOfWeek = monthStart.getDay();
  const emptyDays = Array.from({ length: startDayOfWeek });

  useEffect(() => {
    fetchEvents();
  }, [currentDate]);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const start = monthStart.toISOString();
      const end = monthEnd.toISOString();
      const res = await apiClient.get<any>(`/api/calendar/events?start=${start}&end=${end}`);
      setEvents(res.data || []);
    } catch (error) {
      toast.error('Failed to load events');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEvent = async () => {
    if (!newTitle) return;
    
    try {
      const eventDate = new Date(selectedDay);
      const [hours, minutes] = newTime.split(':').map(Number);
      eventDate.setHours(hours, minutes);

      await apiClient.post('/api/calendar/events', {
        title: newTitle,
        description: newDesc,
        startTime: eventDate.toISOString(),
        location: newLocation,
      });

      toast.success('Event added');
      setIsAddOpen(false);
      fetchEvents();
      setNewTitle('');
      setNewDesc('');
      setNewLocation('');
    } catch (error) {
      toast.error('Failed to create event');
    }
  };

  const toggleComplete = async (event: CalendarEvent) => {
    try {
      await apiClient.patch(`/api/calendar/events/${event.id}`, {
        isCompleted: !event.isCompleted
      });
      fetchEvents();
    } catch (error) {
      toast.error('Failed to update event');
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      await apiClient.delete(`/api/calendar/events/${id}`);
      toast.success('Event deleted');
      fetchEvents();
    } catch (error) {
      toast.error('Failed to delete event');
    }
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const eventsForSelectedDay = events.filter(e => isSameDay(parseISO(e.startTime), selectedDay));

  return (
    <div className="flex h-full w-full bg-background overflow-hidden page-fade-in">
      {/* Calendar Grid Section */}
      <div className="flex-1 flex flex-col border-r border-border/40">
        <header className="h-16 px-8 flex items-center justify-between border-b border-border/30 bg-background/50 backdrop-blur-xl sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold tracking-tight">{format(currentDate, 'MMMM yyyy')}</h1>
            <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg">
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-3 text-[10px] uppercase font-bold tracking-widest" onClick={() => setCurrentDate(new Date())}>
                Today
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl gap-2 shadow-lg shadow-primary/20 h-9 px-5 text-xs font-bold uppercase tracking-wider">
                <Plus className="h-4 w-4" />
                Schedule Task
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl border-border/40 backdrop-blur-2xl">
              <DialogHeader>
                <DialogTitle>New Schedule Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground/60">Task Title</label>
                  <Input placeholder="Enter title..." value={newTitle} onChange={e => setNewTitle(e.target.value)} />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1 space-y-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground/60">Date</label>
                    <Input type="date" value={format(selectedDay, 'yyyy-MM-dd')} onChange={e => setSelectedDay(new Date(e.target.value))} />
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground/60">Time</label>
                    <Input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground/60">Location</label>
                  <Input placeholder="Add location..." value={newLocation} onChange={e => setNewLocation(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground/60">Notes</label>
                  <Textarea placeholder="Add description or notes..." value={newDesc} onChange={e => setNewDesc(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddEvent}>Create Event</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        <div className="flex-1 overflow-auto p-4 custom-scrollbar">
          <div className="grid grid-cols-7 border-t border-l border-border/30 rounded-lg overflow-hidden ring-1 ring-border/20">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="h-10 flex items-center justify-center bg-muted/20 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 border-r border-b border-border/30">
                {day}
              </div>
            ))}
            {emptyDays.map((_, i) => (
              <div key={`empty-${i}`} className="h-32 bg-muted/[0.02] border-r border-b border-border/30" />
            ))}
            {days.map(day => {
              const dayEvents = events.filter(e => isSameDay(parseISO(e.startTime), day));
              return (
                <div
                  key={day.toString()}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    "h-32 p-2 border-r border-b border-border/30 transition-all cursor-pointer group hover:bg-muted/30",
                    isToday(day) ? "bg-primary/[0.02]" : "bg-background",
                    isSameDay(day, selectedDay) && "ring-2 ring-primary inset-0 z-10 bg-primary/[0.01]"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn(
                      "text-xs font-bold h-6 w-6 flex items-center justify-center rounded-full transition-all",
                      isToday(day) ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30" : "text-muted-foreground group-hover:text-foreground",
                      isSameDay(day, selectedDay) && !isToday(day) && "bg-muted text-foreground"
                    )}>
                      {format(day, 'd')}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    )}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map(e => (
                      <div key={e.id} className="text-[10px] p-1 rounded-md truncate bg-primary/5 text-primary border border-primary/10 font-bold tracking-tight">
                        {e.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[9px] text-muted-foreground/40 font-bold ml-1">
                        + {dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Side Details Panel */}
      <div className="w-[400px] flex flex-col bg-sidebar-background/40 backdrop-blur-xl">
        <div className="p-8 space-y-8">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tighter">{format(selectedDay, 'EEEE')}</h2>
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">{format(selectedDay, 'MMMM d, yyyy')}</p>
          </div>

          <div className="space-y-4 flex-1">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 flex items-center gap-2">
              <CalendarIcon className="h-3.5 w-3.5" />
              Scheduled for this day
            </h3>

            {isLoading ? (
              <div className="animate-pulse space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-20 bg-muted/40 rounded-2xl" />
                ))}
              </div>
            ) : eventsForSelectedDay.length === 0 ? (
              <div className="py-12 text-center space-y-4">
                <div className="h-16 w-16 bg-muted/20 rounded-[2rem] mx-auto flex items-center justify-center">
                  <CalendarIcon className="h-8 w-8 text-muted-foreground/20" />
                </div>
                <p className="text-xs font-bold text-muted-foreground/40 uppercase tracking-widest">No tasks scheduled</p>
                <Button variant="ghost" size="sm" onClick={() => setIsAddOpen(true)} className="text-[10px] font-bold text-primary">Add Event</Button>
              </div>
            ) : (
              <div className="space-y-3">
                {eventsForSelectedDay.map(event => (
                  <Card key={event.id} className={cn(
                    "group rounded-2xl border-border/30 overflow-hidden transition-all hover:shadow-xl hover:shadow-black/5",
                    event.isCompleted && "opacity-60"
                  )}>
                    <CardContent className="p-5 flex items-start gap-4">
                      <button onClick={() => toggleComplete(event)} className="mt-1">
                        <CheckCircle2 className={cn(
                          "h-5 w-5 transition-colors",
                          event.isCompleted ? "text-primary fill-primary" : "text-muted-foreground/40 hover:text-primary"
                        )} />
                      </button>
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className={cn(
                          "text-sm font-bold tracking-tight leading-none transition-all",
                          event.isCompleted && "line-through text-muted-foreground"
                        )}>{event.title}</p>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60 font-medium">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(parseISO(event.startTime), 'p')}
                          </span>
                          {event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {event.location}
                            </span>
                          )}
                        </div>
                        {event.description && (
                          <p className="text-[11px] text-muted-foreground/60 pt-2 line-clamp-2 italic">{event.description}</p>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deleteEvent(event.id)} className="opacity-0 group-hover:opacity-100 h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg transition-all">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
