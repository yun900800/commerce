import { db } from "../db";
import { customers, categories, products, orders, orderItems } from "../db/schema";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  // Clear existing data
  db.delete(orderItems).run();
  db.delete(orders).run();
  db.delete(products).run();
  db.delete(categories).run();
  db.delete(customers).run();

  // Seed customers
  const customerData = await db
    .insert(customers)
    .values([
      { name: "Alice Johnson", email: "alice@example.com", phone: "555-0101", address: "123 Main St, Springfield" },
      { name: "Bob Smith", email: "bob@example.com", phone: "555-0102", address: "456 Oak Ave, Portland" },
      { name: "Carol Williams", email: "carol@example.com", phone: "555-0103", address: "789 Pine Rd, Seattle" },
      { name: "David Brown", email: "david@example.com", phone: "555-0104", address: "321 Elm St, Denver" },
      { name: "Eve Davis", email: "eve@example.com", phone: "555-0105", address: "654 Maple Dr, Austin" },
    ])
    .returning();

  console.log(`  ✓ Inserted ${customerData.length} customers`);

  // Seed categories
  const categoryData = await db
    .insert(categories)
    .values([
      { name: "Electronics", slug: "electronics", description: "Electronic devices and accessories" },
      { name: "Clothing", slug: "clothing", description: "Apparel and fashion items" },
      { name: "Home & Garden", slug: "home-garden", description: "Home improvement and garden supplies" },
      { name: "Books", slug: "books", description: "Books and publications" },
      { name: "Sports", slug: "sports", description: "Sports equipment and gear" },
    ])
    .returning();

  console.log(`  ✓ Inserted ${categoryData.length} categories`);

  // Seed products
  const productData = await db
    .insert(products)
    .values([
      { name: "Wireless Headphones", slug: "wireless-headphones", description: "Bluetooth noise-cancelling headphones", price: 79.99, stock: 50, categoryId: categoryData[0].id },
      { name: "USB-C Hub", slug: "usb-c-hub", description: "7-in-1 USB-C hub with HDMI", price: 34.99, stock: 100, categoryId: categoryData[0].id },
      { name: "Cotton T-Shirt", slug: "cotton-t-shirt", description: "Premium cotton crew neck t-shirt", price: 24.99, stock: 200, categoryId: categoryData[1].id },
      { name: "Denim Jacket", slug: "denim-jacket", description: "Classic denim jacket with modern fit", price: 89.99, stock: 30, categoryId: categoryData[1].id },
      { name: "Potted Plant Set", slug: "potted-plant-set", description: "Set of 3 artificial potted plants", price: 45.00, stock: 25, categoryId: categoryData[2].id },
      { name: "Stainless Steel Water Bottle", slug: "water-bottle", description: "32oz insulated water bottle", price: 28.00, stock: 150, categoryId: categoryData[2].id },
      { name: "TypeScript Handbook", slug: "typescript-handbook", description: "Comprehensive TypeScript guide", price: 39.99, stock: 75, categoryId: categoryData[3].id },
      { name: "Yoga Mat", slug: "yoga-mat", description: "Non-slip exercise yoga mat", price: 32.00, stock: 60, categoryId: categoryData[4].id },
      { name: "Running Shoes", slug: "running-shoes", description: "Lightweight running shoes", price: 119.99, stock: 40, categoryId: categoryData[4].id },
      { name: "Smart LED Bulb", slug: "smart-led-bulb", description: "WiFi-enabled color-changing LED bulb", price: 19.99, stock: 80, categoryId: categoryData[0].id },
    ])
    .returning();

  console.log(`  ✓ Inserted ${productData.length} products`);

  // Seed orders
  const orderData = await db
    .insert(orders)
    .values([
      { customerId: customerData[0].id, status: "delivered", totalAmount: 114.98 },
      { customerId: customerData[1].id, status: "shipped", totalAmount: 89.99 },
      { customerId: customerData[2].id, status: "confirmed", totalAmount: 73.00 },
      { customerId: customerData[0].id, status: "pending", totalAmount: 39.99 },
      { customerId: customerData[3].id, status: "delivered", totalAmount: 159.98 },
      { customerId: customerData[4].id, status: "pending", totalAmount: 64.99 },
      { customerId: customerData[1].id, status: "delivered", totalAmount: 28.00 },
    ])
    .returning();

  console.log(`  ✓ Inserted ${orderData.length} orders`);

  // Seed order items
  await db.insert(orderItems).values([
    { orderId: orderData[0].id, productId: productData[0].id, quantity: 1, unitPrice: 79.99 },
    { orderId: orderData[0].id, productId: productData[1].id, quantity: 1, unitPrice: 34.99 },
    { orderId: orderData[1].id, productId: productData[3].id, quantity: 1, unitPrice: 89.99 },
    { orderId: orderData[2].id, productId: productData[4].id, quantity: 1, unitPrice: 45.00 },
    { orderId: orderData[2].id, productId: productData[5].id, quantity: 1, unitPrice: 28.00 },
    { orderId: orderData[3].id, productId: productData[6].id, quantity: 1, unitPrice: 39.99 },
    { orderId: orderData[4].id, productId: productData[2].id, quantity: 2, unitPrice: 24.99 },
    { orderId: orderData[4].id, productId: productData[9].id, quantity: 1, unitPrice: 19.99 },
    { orderId: orderData[4].id, productId: productData[8].id, quantity: 1, unitPrice: 89.99 },
    { orderId: orderData[5].id, productId: productData[7].id, quantity: 1, unitPrice: 32.00 },
    { orderId: orderData[5].id, productId: productData[0].id, quantity: 1, unitPrice: 79.99 },
    { orderId: orderData[5].id, productId: productData[5].id, quantity: 1, unitPrice: 28.00 },
  ]);

  console.log(`  ✓ Inserted order items`);

  // Fix the 5th order total to match items: 2x24.99 + 19.99 + 89.99 = 159.96
  db.update(orders)
    .set({ totalAmount: 159.96 })
    .where(eq(orders.id, orderData[4].id))
    .run();

  // Fix the 6th order total to match items: 32.00 + 79.99 + 28.00 = 139.99
  db.update(orders)
    .set({ totalAmount: 139.99 })
    .where(eq(orders.id, orderData[5].id))
    .run();

  console.log("  ✓ Fixed order totals");
  console.log("\n✅ Seeding complete!");
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
