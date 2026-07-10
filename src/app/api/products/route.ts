import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products } from "@/db/schema";
import { eq, like, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");
  const q = searchParams.get("q");

  if (id) {
    const product = await db
      .select()
      .from(products)
      .where(eq(products.id, Number(id)))
      .get();

    if (!product) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(product);
  }

  const query = db.select().from(products);

  if (q) {
    query.where(like(products.name, `%${q}%`));
  }

  query.orderBy(desc(products.createdAt));

  const allProducts = await query;
  return NextResponse.json(allProducts);
}

export async function POST(request: Request) {
  const body = await request.json();
  const newProduct = await db
    .insert(products)
    .values({
      name: body.name,
      slug: body.slug,
      description: body.description ?? null,
      price: Number(body.price),
      stock: body.stock ?? 0,
      imageUrl: body.imageUrl ?? null,
      categoryId: body.categoryId ?? null,
    })
    .returning();

  return NextResponse.json(newProduct[0], { status: 201 });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") ?? body.id;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const updated = await db
    .update(products)
    .set({
      name: body.name,
      slug: body.slug,
      description: body.description ?? null,
      price: Number(body.price),
      stock: body.stock ?? 0,
      imageUrl: body.imageUrl ?? null,
      categoryId: body.categoryId ?? null,
    })
    .where(eq(products.id, Number(id)))
    .returning();

  if (updated.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated[0]);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  await db.delete(products).where(eq(products.id, Number(id)));
  return NextResponse.json({ success: true });
}
