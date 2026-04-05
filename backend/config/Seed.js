/**
 * Seed Script
 * Run: npm run seed
 * Clears and repopulates Products + Events collections
 */

import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "./Db.js";          // Db.js must be in the same folder as seed.js (config/)
import Product from "../models/Product.js";
import Event from "../models/Event.js";

// ─── Products ────────────────────────────────
const products = [
  {
    name: "F1 Premium",
    slug: "f1-premium",
    category: "Streaming",
    type: "subscription",
    price: 19,
    billingCycle: "month",
    description:
      "Full access to all F1 live streams with multi-angle cameras, real-time telemetry, and ultra-low latency.",
    features: [
      "All F1 live races",
      "Multi-angle camera feeds",
      "Real-time telemetry data",
      "Race replays on-demand",
      "HD quality streaming",
    ],
    image: "/assets/products/premium.png",
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
  },
  {
    name: "Discord Xclusive",
    slug: "discord-xclusive",
    category: "Community",
    type: "subscription",
    price: 9,
    billingCycle: "month",
    description:
      "Exclusive access to F1 Air Network's premium Discord server with race alerts, analysis channels, and VIP giveaways.",
    features: [
      "VIP Discord role",
      "Exclusive race analysis channels",
      "Priority support",
      "Monthly giveaways",
      "Early event announcements",
    ],
    image: "/assets/products/xclusive.png",
    isActive: true,
    sortOrder: 2,
  },
  {
    name: "Elite Pack",
    slug: "elite-pack",
    category: "Premium",
    type: "subscription",
    price: 29,
    billingCycle: "month",
    description:
      "The ultimate F1 Air experience — F1 Premium + Discord Xclusive + MotoGP & WEC coverage.",
    features: [
      "Everything in F1 Premium",
      "Everything in Discord Xclusive",
      "MotoGP & WEC coverage",
      "Exclusive merchandise discounts",
      "1-on-1 onboarding session",
    ],
    image: "/assets/products/elite.png",
    isFeatured: true,
    isActive: true,
    sortOrder: 3,
  },
  {
    name: "Discord Premium",
    slug: "discord-premium",
    category: "Community",
    type: "subscription",
    price: 19,
    billingCycle: "month",
    description: "Discord Nitro subscription delivered to your account.",
    features: [
      "Discord Nitro benefits",
      "Boosted server perks",
      "Custom emojis & stickers",
      "HD video streaming in calls",
    ],
    image: "/assets/products/dcpr.png",
    isActive: true,
    sortOrder: 4,
  },
  {
    name: "YouTube Premium",
    slug: "youtube-premium",
    category: "Streaming",
    type: "subscription",
    price: 9,
    billingCycle: "month",
    description: "YouTube Premium — ad-free viewing and background play.",
    features: [
      "Ad-free YouTube",
      "Background play",
      "YouTube Music included",
      "Offline downloads",
    ],
    image: "/assets/products/youtube.png",
    isActive: true,
    sortOrder: 5,
  },
  {
    name: "Netflix",
    slug: "netflix",
    category: "Streaming",
    type: "subscription",
    price: 29,
    billingCycle: "month",
    description: "Netflix Premium plan — 4K Ultra HD, 4 screens.",
    features: [
      "4K Ultra HD",
      "4 simultaneous screens",
      "Downloads on mobile",
      "Netflix Originals access",
    ],
    image: "/assets/products/netflix.png",
    isActive: true,
    sortOrder: 6,
  },
  // ─── Screen Add-ons ──────────────────────────
  // Admin can add more or change prices from the admin panel
  {
    name: "1 Extra Screen",
    slug: "screen-1",
    category: "Screen",
    type: "screen",
    screensGranted: 1,
    price: 4.99,
    billingCycle: "month",
    description: "Add one extra concurrent screen to your account. Watch on an additional device simultaneously.",
    features: [
      "1 additional concurrent screen",
      "Watch on any device",
      "Manage from your account",
    ],
    image: "/assets/products/screen.png",
    isActive: true,
    sortOrder: 7,
  },
  {
    name: "3 Screen Bundle",
    slug: "screen-3",
    category: "Screen",
    type: "screen",
    screensGranted: 3,
    price: 11.99,
    billingCycle: "month",
    description: "Add three extra screens at a discounted bundle price.",
    features: [
      "3 additional concurrent screens",
      "Save vs buying individually",
      "Watch on any device",
      "Manage from your account",
    ],
    image: "/assets/products/screen.png",
    isActive: true,
    sortOrder: 8,
  },
];

// ─── Events ──────────────────────────────────
const events = [
  {
    name: "F1 Monaco Grand Prix",
    series: "Formula 1",
    status: "live",
    displayTime: "Live Now",
    isoTime: new Date(),
    circuit: "Circuit de Monaco",
    badge: "LIVE",
    badgeColor: "red",
    featured: true,
  },
  {
    name: "MotoGP: Italian GP",
    series: "MotoGP",
    status: "upcoming",
    displayTime: "Today, 14:00 GMT",
    circuit: "Mugello Circuit",
    badge: "TODAY",
    badgeColor: "yellow",
    featured: false,
  },
  {
    name: "WEC: 24h Le Mans",
    series: "WEC",
    status: "upcoming",
    displayTime: "Sat, 16:00 GMT",
    circuit: "Circuit de la Sarthe",
    featured: false,
  },
  {
    name: "F1: Spanish GP Qualifying",
    series: "Formula 1",
    status: "upcoming",
    displayTime: "Sat, 13:00 GMT",
    circuit: "Circuit de Barcelona-Catalunya",
    featured: false,
  },
  {
    name: "IndyCar: Detroit GP",
    series: "IndyCar",
    status: "upcoming",
    displayTime: "Sun, 18:00 GMT",
    circuit: "Detroit Street Circuit",
    featured: false,
  },
  {
    name: "Formula E: Berlin E-Prix",
    series: "Formula E",
    status: "upcoming",
    displayTime: "Mon, 12:00 GMT",
    circuit: "Tempelhof Airport Street Circuit",
    featured: false,
  },
];

const seed = async () => {
  await connectDB();
  console.log("\n🌱 Seeding database...\n");

  await Product.deleteMany({});
  await Event.deleteMany({});
  console.log("🗑️  Cleared existing data");

  const insertedProducts = await Product.insertMany(products);
  console.log(`✅ Inserted ${insertedProducts.length} products`);

  const insertedEvents = await Event.insertMany(events);
  console.log(`✅ Inserted ${insertedEvents.length} events`);

  console.log("\n🏁 Seed complete!\n");
  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});