import { z } from "zod"
import { ListingStatus, QuoteStatus } from "@prisma/client"

// Listing schemas
export const listingCreateSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  slug: z.string().optional(), // Auto-generated if not provided
  description: z.string().optional(),
  status: z.nativeEnum(ListingStatus).default(ListingStatus.DRAFT),
  categoryId: z.string().optional(),
  brand: z.string().optional(),
  moq: z.number().int().positive().optional(),
  leadTimeDays: z.number().int().nonnegative().optional(),
  basePrice: z.number().nonnegative().optional(),
  pricingModel: z.enum(["unit", "tiered", "custom"]).optional(),
})

export const listingUpdateSchema = listingCreateSchema.partial().extend({
  id: z.string(),
})

export const listingVariantSchema = z.object({
  id: z.string().optional(), // For updates
  sku: z.string().min(1, "SKU is required"),
  option1Name: z.string().optional(),
  option1Value: z.string().optional(),
  option2Name: z.string().optional(),
  option2Value: z.string().optional(),
  cost: z.number().nonnegative().optional(),
  price: z.number().nonnegative().optional(),
  moq: z.number().int().positive().optional(),
  leadTimeDays: z.number().int().nonnegative().optional(),
  active: z.boolean().default(true),
})

export const listingMediaSchema = z.object({
  id: z.string().optional(),
  url: z.string().url("Invalid URL"),
  alt: z.string().optional(),
  sortOrder: z.number().int().default(0),
})

export const listingWithVariantsSchema = listingCreateSchema.extend({
  variants: z.array(listingVariantSchema).optional(),
  media: z.array(listingMediaSchema).optional(),
})

// Category schemas
export const categoryCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  slug: z.string().optional(),
  parentId: z.string().optional(),
  description: z.string().optional(),
  sortOrder: z.number().int().default(0),
})

export const categoryUpdateSchema = categoryCreateSchema.partial().extend({
  id: z.string(),
})

// Quote schemas
export const quoteStatusUpdateSchema = z.object({
  status: z.nativeEnum(QuoteStatus),
  internalNotes: z.string().optional(),
})

export const quoteLineItemSchema = z.object({
  id: z.string().optional(),
  listingId: z.string().optional(),
  variantId: z.string().optional(),
  customTitle: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().int().positive("Quantity must be positive"),
  specs: z.record(z.any()).optional(),
  unitPrice: z.number().nonnegative().optional(),
  lineTotal: z.number().nonnegative().optional(),
  internalCost: z.number().nonnegative().optional(),
  margin: z.number().nonnegative().max(100).optional(), // Percentage
  notes: z.string().optional(),
})

export const quoteUpdateSchema = z.object({
  status: z.nativeEnum(QuoteStatus).optional(),
  contactId: z.string().optional(),
  internalNotes: z.string().optional(),
  adminNotes: z.string().optional(),
  totalEstimate: z.number().nonnegative().optional(),
  targetDueDate: z.string().datetime().optional(),
  lineItems: z.array(quoteLineItemSchema).optional(),
})

export const quoteMessageSchema = z.object({
  message: z.string().min(1, "Message is required"),
  isInternal: z.boolean().default(false),
})

export const quoteConvertToOrderSchema = z.object({
  orderNumber: z.string().optional(), // Auto-generated if not provided
  shippingAddress: z.string().optional(),
  shippingCity: z.string().optional(),
  shippingState: z.string().optional(),
  shippingCountry: z.string().optional(),
  shippingPostalCode: z.string().optional(),
})

// Client/Company schemas
export const companyCreateSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  taxId: z.string().optional(),
  billingAddress: z.string().optional(),
  shippingAddress: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

export const companyUpdateSchema = companyCreateSchema.partial().extend({
  id: z.string(),
})

export const clientContactSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  roleTitle: z.string().optional(),
  isPrimary: z.boolean().default(false),
})

// Query params schemas
export const listingListQuerySchema = z.object({
  status: z.nativeEnum(ListingStatus).optional(),
  categoryId: z.string().optional(),
  search: z.string().optional(),
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
})

export const quoteListQuerySchema = z.object({
  status: z.nativeEnum(QuoteStatus).optional(),
  search: z.string().optional(),
  companyId: z.string().optional(),
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
})

export const auditLogQuerySchema = z.object({
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  action: z.string().optional(),
  actorUserId: z.string().optional(),
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 50)),
})
