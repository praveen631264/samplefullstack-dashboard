import { db } from "./db";
import { products, orders, activities } from "@shared/schema";
import { sql } from "drizzle-orm";
import { log } from "./index";

export async function seedDatabase() {
  if (process.env.NODE_ENV === "production") {
    log("Skipping seed in production environment");
    return;
  }

  const [existing] = await db.select({ count: sql<number>`COUNT(*)` }).from(products);
  if (Number(existing.count) > 0) {
    log("Database already seeded, skipping...");
    return;
  }

  log("Seeding database...");

  const seedProducts = await db
    .insert(products)
    .values([
      { name: "Wireless Headphones", category: "Electronics", price: 79.99, stock: 145, status: "active" },
      { name: "Mechanical Keyboard", category: "Electronics", price: 129.99, stock: 82, status: "active" },
      { name: "USB-C Hub Adapter", category: "Accessories", price: 49.99, stock: 230, status: "active" },
      { name: "Ergonomic Mouse", category: "Electronics", price: 59.99, stock: 64, status: "active" },
      { name: "Monitor Stand", category: "Furniture", price: 89.99, stock: 37, status: "active" },
      { name: "Webcam HD 1080p", category: "Electronics", price: 69.99, stock: 112, status: "active" },
      { name: "Desk Lamp LED", category: "Furniture", price: 34.99, stock: 98, status: "active" },
      { name: "Cable Management Kit", category: "Accessories", price: 19.99, stock: 310, status: "active" },
      { name: "Laptop Stand", category: "Accessories", price: 44.99, stock: 156, status: "active" },
      { name: "Noise Canceling Earbuds", category: "Electronics", price: 99.99, stock: 0, status: "inactive" },
    ])
    .returning();

  const customers = [
    "Alice Johnson", "Bob Smith", "Carol Williams", "David Brown",
    "Emma Davis", "Frank Miller", "Grace Wilson", "Henry Moore",
  ];

  const statuses = ["completed", "pending", "processing", "shipped", "cancelled"];

  const orderValues = [];
  for (let i = 0; i < 30; i++) {
    const product = seedProducts[Math.floor(Math.random() * seedProducts.length)];
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const quantity = Math.floor(Math.random() * 5) + 1;
    const daysAgo = Math.floor(Math.random() * 180);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    orderValues.push({
      customerName: customer,
      productId: product.id,
      quantity,
      totalAmount: product.price * quantity,
      status,
      createdAt: date,
    });
  }

  await db.insert(orders).values(orderValues);

  const activityValues = [
    { type: "order", description: "New order placed by Alice Johnson for Wireless Headphones", entityName: "Alice Johnson" },
    { type: "product", description: "Product stock updated: Mechanical Keyboard (+50 units)", entityName: "Mechanical Keyboard" },
    { type: "customer", description: "New customer registered: Grace Wilson", entityName: "Grace Wilson" },
    { type: "order", description: "Order completed for Bob Smith - USB-C Hub Adapter x2", entityName: "Bob Smith" },
    { type: "alert", description: "Low stock warning: Noise Canceling Earbuds (0 remaining)", entityName: "Noise Canceling Earbuds" },
    { type: "order", description: "Order shipped to Carol Williams - Monitor Stand", entityName: "Carol Williams" },
    { type: "product", description: "New product added: Cable Management Kit ($19.99)", entityName: "Cable Management Kit" },
    { type: "customer", description: "Customer Emma Davis updated shipping address", entityName: "Emma Davis" },
    { type: "order", description: "Payment received for order from David Brown", entityName: "David Brown" },
    { type: "alert", description: "Price change applied: Ergonomic Mouse $59.99 -> $54.99", entityName: "Ergonomic Mouse" },
  ];

  await db.insert(activities).values(activityValues);

  log("Database seeded successfully!");
}
