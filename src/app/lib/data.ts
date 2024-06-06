import {unstable_noStore as noStore} from 'next/cache';
import {sql} from '@vercel/postgres';

import prisma from "@/lib/prisma";

import type {CustomersTableType,} from './definitions';
import {formatCurrency} from './utils';

export async function fetchRevenue() {
  // Add noStore() here to prevent the response from being cached.
  // This is equivalent to in fetch(..., {cache: 'no-store'}).
  noStore();

  try {
    // const data = await sql<Revenue>`SELECT * FROM revenue`;
    const data = await prisma.revenue.findMany();

    return data;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch revenue data.');
  }
}

export async function fetchLatestInvoices() {
  noStore();

  try {
    const data = await prisma.invoices.findMany({
      include: {
        customer: true,
      },
      take: 5,
      orderBy: [{
        date: "desc",
      }]
    })

    const latestInvoices = data.map((invoice) => ({
      ...invoice,
      amount: formatCurrency(invoice.amount),
    }));

    return latestInvoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the latest invoices.');
  }
}

export async function fetchCardData() {
  noStore();

  try {
    const invoiceCountPromise = prisma.invoices.count();
    const customerCountPromise = prisma.customers.count();
    const invoiceStatusPromise = prisma.invoices.groupBy({
      _sum: {
        amount: true,
      },
      by: ["status"]
    });

    const data = await Promise.all([
      invoiceCountPromise,
      customerCountPromise,
      invoiceStatusPromise,
    ]);

    console.log(data[2]);

    const numberOfInvoices= Number(data[0] ?? 0);
    const numberOfCustomers = Number(data[1] ?? 0);
    const totalPaidInvoices = formatCurrency(data[2].find(item=> item.status === "paid")?._sum.amount ?? 0);
    const totalPendingInvoices = formatCurrency(data[2].find(item=> item.status === "pending")?._sum.amount ?? 0);

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch card data.');
  }
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number,
) {
  noStore();

  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    const invoices = await prisma.invoices.findMany({
      include: {
        customer: true,
      },
      where: {
        OR: [
          {
            customer: {
              name: {
                contains: query,
                mode: "insensitive",
              },
            },
          }, {
            customer: {
              email: {
                contains: query,
                mode: "insensitive",
              },
            },
          }, {
            status: {
              contains: query,
              mode: "insensitive",
            },
          },
          // amount: {
          //   contains: query,
          //
          // }
          // date: {
          //
          // },
        ],
      },
      orderBy: {
        date: "desc",
      },
      skip: offset,
      take: ITEMS_PER_PAGE,
    });

    return invoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices.');
  }
}

export async function fetchInvoicesPages(query: string) {
  noStore();

  try {
    const count = await prisma.invoices.count({
      where: {
        OR: [{
            customer: {
              name: {
                contains: query,
                mode: "insensitive",
              },
            },
          }, {
            customer: {
              email: {
                contains: query,
                mode: "insensitive",
              },
            },
          }, {
            status: {
              contains: query,
              mode: "insensitive",
            },
          },
        ],
      },
    })

    const totalPages = Math.ceil(Number(count) / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch total number of invoices.');
  }
}

export async function fetchInvoiceById(id: string) {
  noStore();
  
  try {
    const data = await prisma.invoices.findMany({
      where: {
        id: id,
      }
    })

    const invoice = data.map((invoice) => ({
      ...invoice,
      // Convert amount from cents to dollars
      amount: invoice.amount / 100,
    }));

    return invoice[0];
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoice.');
  }
}

export async function fetchCustomers() {
  try {
    const customers = await prisma.customers.findMany({
      orderBy: {
        name: "asc",
      },
    });

    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch all customers.');
  }
}

export async function fetchFilteredCustomers(query: string) {
  try {
    // const data = await sql<CustomersTableType>`
		// SELECT
		//   customers.id,
		//   customers.name,
		//   customers.email,
		//   customers.image_url,
		//   COUNT(invoices.id) AS total_invoices,
		//   SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
		//   SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
		// FROM customers
		// LEFT JOIN invoices ON customers.id = invoices.customer_id
		// WHERE
		//   customers.name ILIKE ${`%${query}%`} OR
    //     customers.email ILIKE ${`%${query}%`}
		// GROUP BY customers.id, customers.name, customers.email, customers.image_url
		// ORDER BY customers.name ASC
	  // `;

    type Customer  = typeof prisma.customers.fields & {
      total_invoices: number;
      total_paid: number;
      total_pending: number;
    }

    const data: Customer[] = await prisma.$queryRaw`
    SELECT
		  customers.id,
		  customers.name,
		  customers.email,
		  customers.image_url,
		  COUNT(invoices.id) AS total_invoices,
		  SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
		  SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
		FROM customers
		LEFT JOIN invoices ON customers.id = invoices.customer_id
		WHERE
		  customers.name ILIKE '%${`${query}`}%' OR
        customers.email ILIKE '%${`${query}`}%'
		GROUP BY customers.id, customers.name, customers.email, customers.image_url
		ORDER BY customers.name ASC
    `;

    const customers = data.map((customer) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));

    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch customer table.');
  }
}
