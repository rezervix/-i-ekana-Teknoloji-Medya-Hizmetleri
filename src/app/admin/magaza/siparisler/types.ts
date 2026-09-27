// Shared types for the orders management module
// Uses explicit Prisma payload scalars to avoid GetPayload inference issues

import type { Prisma } from "@prisma/client";

// Extract scalars directly from Prisma payload (all Order DB columns)
type OrderScalars = Prisma.$OrderPayload["scalars"];

// Minimal product shape we need in the modal
type ProductShape = {
  id: string;
  name: string;
  images: string[];
  slug: string;
  price: number;
  isActive: boolean;
  category: string;
  description: string | null;
  subcategory: string | null;
  stock: number | null;
  isFeatured: boolean;
  customizationOptions: Prisma.JsonValue | null;
  photoToDesignFee: number | null;
  createdAt: Date;
  updatedAt: Date;
};

type DesignTemplateShape = {
  id: string;
  productId: string | null;
  subcategory: string | null;
  nicheLabels: string[];
  frontImage: string | null;
  backImage: string | null;
  frontImageUrl: string | null;
  backImageUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  product: { id: string; name: string } | null;
};

type OrderItemShape = {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  customizationData: Prisma.JsonValue | null;
  selectedTemplateId: string | null;
  product: ProductShape;
  selectedTemplate: DesignTemplateShape | null;
};

export type OrderWithItems = OrderScalars & {
  items: OrderItemShape[];
};
