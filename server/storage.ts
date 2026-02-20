import { eq, desc, sql, count } from "drizzle-orm";
import { db } from "./db";
import {
  users, products, orders, activities,
  type User, type InsertUser,
  type Product, type InsertProduct,
  type Order, type InsertOrder,
  type Activity, type InsertActivity,
  type DashboardMetrics, type RevenueByMonth, type OrdersByStatus, type TopProduct,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getProducts(): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  getOrders(): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  getActivities(): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  getDashboardMetrics(): Promise<DashboardMetrics>;
  getRevenueByMonth(): Promise<RevenueByMonth[]>;
  getOrdersByStatus(): Promise<OrdersByStatus[]>;
  getTopProducts(): Promise<TopProduct[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getProducts(): Promise<Product[]> {
    return db.select().from(products);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [created] = await db.insert(products).values(product).returning();
    return created;
  }

  async getOrders(): Promise<Order[]> {
    return db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [created] = await db.insert(orders).values(order).returning();
    return created;
  }

  async getActivities(): Promise<Activity[]> {
    return db.select().from(activities).orderBy(desc(activities.createdAt)).limit(20);
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const [created] = await db.insert(activities).values(activity).returning();
    return created;
  }

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const [revenueResult] = await db
      .select({ total: sql<number>`COALESCE(SUM(total_amount), 0)` })
      .from(orders);

    const [ordersCount] = await db.select({ total: count() }).from(orders);
    const [productsCount] = await db.select({ total: count() }).from(products);

    const uniqueCustomers = await db
      .selectDistinct({ name: orders.customerName })
      .from(orders);

    return {
      totalRevenue: Number(revenueResult?.total ?? 0),
      totalOrders: ordersCount?.total ?? 0,
      totalProducts: productsCount?.total ?? 0,
      activeCustomers: uniqueCustomers.length,
      revenueChange: 12.5,
      ordersChange: 8.2,
      productsChange: 3.1,
      customersChange: 5.4,
    };
  }

  async getRevenueByMonth(): Promise<RevenueByMonth[]> {
    const result = await db
      .select({
        month: sql<string>`TO_CHAR(created_at, 'Mon')`,
        revenue: sql<number>`COALESCE(SUM(total_amount), 0)`,
        orders: sql<number>`COUNT(*)`,
      })
      .from(orders)
      .groupBy(sql`TO_CHAR(created_at, 'Mon'), EXTRACT(MONTH FROM created_at)`)
      .orderBy(sql`EXTRACT(MONTH FROM created_at)`);

    return result.map((r) => ({
      month: r.month,
      revenue: Number(r.revenue),
      orders: Number(r.orders),
    }));
  }

  async getOrdersByStatus(): Promise<OrdersByStatus[]> {
    const result = await db
      .select({
        status: orders.status,
        count: count(),
      })
      .from(orders)
      .groupBy(orders.status);

    return result.map((r) => ({
      status: r.status,
      count: r.count,
    }));
  }

  async getTopProducts(): Promise<TopProduct[]> {
    const result = await db
      .select({
        name: products.name,
        category: products.category,
        totalSold: sql<number>`COALESCE(SUM(${orders.quantity}), 0)`,
        revenue: sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)`,
      })
      .from(products)
      .leftJoin(orders, eq(products.id, orders.productId))
      .groupBy(products.name, products.category)
      .orderBy(sql`SUM(${orders.totalAmount}) DESC NULLS LAST`)
      .limit(5);

    return result.map((r) => ({
      name: r.name,
      category: r.category,
      totalSold: Number(r.totalSold),
      revenue: Number(r.revenue),
    }));
  }
}

export const storage = new DatabaseStorage();
