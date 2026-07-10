import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers, orders } from "@/db/schema";
import { eq, like, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");
  const q = searchParams.get("q");

  if (id) {
    const customer = await db
      .select()
      .from(customers)
      .where(eq(customers.id, Number(id)))
      .get();

    if (!customer) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(customer);
  }

  const query = db.select().from(customers);

  if (q) {
    query.where(like(customers.name, `%${q}%`));
  }

  query.orderBy(desc(customers.createdAt));

  const allCustomers = await query;
  return NextResponse.json(allCustomers);
}

export async function POST(request: Request) {
  const body = await request.json();

  const newCustomer = await db
    .insert(customers)
    .values({
      name: body.name,
      email: body.email,
      phone: body.phone ?? null,
      address: body.address ?? null,
    })
    .returning();

  return NextResponse.json(newCustomer[0], { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const customerId = Number(id);

  // Check if customer has orders
  const existingOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.customerId, customerId))
    .get();

  if (existingOrders) {
    return NextResponse.json(
      { error: "Cannot delete customer with existing orders. Delete their orders first." },
      { status: 409 }
    );
  }

  const deleted = await db
    .delete(customers)
    .where(eq(customers.id, customerId))
    .returning();

  if (deleted.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Customer deleted", id: customerId });
}
