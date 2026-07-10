import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems, products } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");
  const status = searchParams.get("status");

  if (id) {
    const order = await db
      .select()
      .from(orders)
      .where(eq(orders.id, Number(id)))
      .get();

    if (!order) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const items = await db
      .select({
        id: orderItems.id,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
        productId: orderItems.productId,
        productName: products.name,
      })
      .from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, Number(id)));

    return NextResponse.json({ ...order, items });
  }

  const query = db.select().from(orders);

  if (status && ["pending", "confirmed", "shipped", "delivered", "cancelled"].includes(status)) {
    query.where(eq(orders.status, status));
  }

  query.orderBy(desc(orders.createdAt));

  const allOrders = await query;
  return NextResponse.json(allOrders);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { customerId, items } = body;

  if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: "customerId and items array are required" },
      { status: 400 }
    );
  }

  // Calculate total from items
  let totalAmount = 0;
  const orderItemsData = [];

  for (const item of items) {
    const product = await db
      .select()
      .from(products)
      .where(eq(products.id, item.productId))
      .get();

    if (!product) {
      return NextResponse.json(
        { error: `Product ${item.productId} not found` },
        { status: 404 }
      );
    }

    const unitPrice = item.unitPrice ?? product.price;
    const quantity = item.quantity ?? 1;
    totalAmount += Number(unitPrice) * quantity;

    orderItemsData.push({
      productId: item.productId,
      quantity,
      unitPrice,
    });
  }

  const newOrder = await db
    .insert(orders)
    .values({
      customerId,
      totalAmount,
    })
    .returning();

  const orderId = newOrder[0].id;

  // Insert order items
  await db.insert(orderItems).values(
    orderItemsData.map((item) => ({ ...item, orderId }))
  );

  return NextResponse.json({ ...newOrder[0], items: orderItemsData }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") ?? body.id;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const updated = await db
    .update(orders)
    .set({ status: body.status })
    .where(eq(orders.id, Number(id)))
    .returning();

  if (updated.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated[0]);
}
