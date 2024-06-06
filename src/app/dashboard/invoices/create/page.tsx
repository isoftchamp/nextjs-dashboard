import { Suspense } from 'react';
import { Metadata } from 'next';

// import { InvoiceFormSkeleton } from '@/app/ui/invoices/skeletons';
import { RevenueChartSkeleton, LatestInvoicesSkeleton, CardsSkeleton } from '@/app/ui/skeletons';

import Form from '@/app/ui/invoices/create-form';
import Breadcrumbs from '@/app/ui/invoices/breadcrumbs';
import { fetchCustomers } from '@/app/lib/data';

export const metadata: Metadata = {
  title: 'Create Invoice',
}

export default async function Page() {
  const customers = await fetchCustomers();
 
  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Invoices', href: '/dashboard/invoices' },
          {
            label: 'Create Invoice',
            href: '/dashboard/invoices/create',
            active: true,
          },
        ]}
      />
      <Suspense fallback={<CardsSkeleton/>} >
        <Form customers={customers}/>
      </Suspense>
    </main>
  );
}