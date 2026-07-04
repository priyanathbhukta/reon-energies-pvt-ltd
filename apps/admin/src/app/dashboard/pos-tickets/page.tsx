'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

export default function PosTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await api.get('/pos/admin/tickets');
      setTickets(res.data.tickets || []);
    } catch (err) {
      toast.error('Failed to fetch POS tickets');
    } finally {
      setIsLoading(false);
    }
  };

  const updateTicketStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await api.patch(`/pos/admin/tickets/${id}/status`, { status });
      toast.success(`Ticket ${status} successfully`);
      fetchTickets();
    } catch (err: any) {
      toast.error(err.response?.data?.error || `Failed to ${status} ticket`);
    }
  };

  if (isLoading) return <div className="p-8">Loading tickets...</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      <div>
        <h1 className="text-2xl font-bold font-display">POS Profile Update Tickets</h1>
        <p className="text-muted-foreground mt-1">Review and approve profile change requests from POS partners.</p>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/50 text-secondary-foreground">
              <tr>
                <th className="px-6 py-4 font-semibold">Partner</th>
                <th className="px-6 py-4 font-semibold">Ticket Type</th>
                <th className="px-6 py-4 font-semibold">Requested Data</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    No tickets found.
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium">{ticket.full_name}</div>
                      <div className="text-xs text-muted-foreground">{ticket.shop_name}</div>
                      <div className="text-xs text-muted-foreground">{ticket.mobile}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 border border-blue-500/20">
                        {ticket.ticket_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <pre className="text-xs max-w-xs overflow-x-auto whitespace-pre-wrap bg-secondary/30 p-2 rounded">
                        {JSON.stringify(ticket.requested_data, null, 2)}
                      </pre>
                    </td>
                    <td className="px-6 py-4">
                      {ticket.status === 'pending' && (
                        <span className="flex items-center gap-1.5 text-amber-600"><Clock className="w-4 h-4" /> Pending</span>
                      )}
                      {ticket.status === 'approved' && (
                        <span className="flex items-center gap-1.5 text-emerald-600"><CheckCircle2 className="w-4 h-4" /> Approved</span>
                      )}
                      {ticket.status === 'rejected' && (
                        <span className="flex items-center gap-1.5 text-red-600"><XCircle className="w-4 h-4" /> Rejected</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {ticket.status === 'pending' && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => updateTicketStatus(ticket.id, 'approved')}
                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium rounded-lg transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => updateTicketStatus(ticket.id, 'rejected')}
                            className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
