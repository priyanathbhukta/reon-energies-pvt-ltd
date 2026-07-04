'use client';

import React from 'react';
import QuotationForm from '@/components/QuotationForm';

export default function POSQuotationPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div>
        <h1 className="text-2xl font-bold text-foreground font-display">Quotation Generator</h1>
        <p className="text-sm text-muted-foreground">
          Create and download customized solar quotations for your customers
        </p>
      </div>
      
      <div className="bg-card rounded-xl border border-border p-6">
        <QuotationForm />
      </div>
    </div>
  );
}
