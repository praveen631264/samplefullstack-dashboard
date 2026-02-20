import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProductSchema, insertOrderSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: "PostgreSQL",
      version: "1.0.0",
    });
  });

  app.get("/api/dashboard/metrics", async (_req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  app.get("/api/dashboard/revenue", async (_req, res) => {
    try {
      const revenue = await storage.getRevenueByMonth();
      res.json(revenue);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch revenue data" });
    }
  });

  app.get("/api/dashboard/orders-by-status", async (_req, res) => {
    try {
      const data = await storage.getOrdersByStatus();
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders by status" });
    }
  });

  app.get("/api/dashboard/top-products", async (_req, res) => {
    try {
      const data = await storage.getTopProducts();
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch top products" });
    }
  });

  app.get("/api/products", async (_req, res) => {
    try {
      const data = await storage.getProducts();
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const parsed = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(parsed);
      res.status(201).json(product);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Invalid product data" });
    }
  });

  app.get("/api/orders", async (_req, res) => {
    try {
      const data = await storage.getOrders();
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const parsed = insertOrderSchema.parse(req.body);
      const order = await storage.createOrder(parsed);
      res.status(201).json(order);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Invalid order data" });
    }
  });

  app.get("/api/activities", async (_req, res) => {
    try {
      const data = await storage.getActivities();
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  return httpServer;
}
