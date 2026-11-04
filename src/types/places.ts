import type { z } from "zod";
import type {
  activityClassificationSchema,
  activityFilterKeySchema,
  activityPlaceSchema,
  assetSourceSchema,
  cafeFilterKeySchema,
  cafePlaceSchema,
  evidenceValueSchema,
  excelSourceSchema,
  foodPlaceSchema,
  imageAssetSchema,
  openingHoursSchema,
  placeCatalogSchema,
  placeDataBundleSchema,
  placeImageSchema,
  placeSchema,
  priceSchema,
} from "@/lib/validation/placeSchemas";

// Schemas own the contract; type-only imports add no runtime validation to UI bundles.
export type Place = z.infer<typeof placeSchema>;
export type CafePlace = z.infer<typeof cafePlaceSchema>;
export type FoodPlace = z.infer<typeof foodPlaceSchema>;
export type ActivityPlace = z.infer<typeof activityPlaceSchema>;
export type PlaceCategory = Place["category"];
export type PlaceId = Place["id"];
export type ImageAsset = z.infer<typeof imageAssetSchema>;
export type PlaceImage = z.infer<typeof placeImageSchema>;
export type ExcelSource = z.infer<typeof excelSourceSchema>;
export type AssetSource = z.infer<typeof assetSourceSchema>;
export type PlaceCatalog = z.infer<typeof placeCatalogSchema>;
export type PlaceDataBundle = z.infer<typeof placeDataBundleSchema>;
export type Price = z.infer<typeof priceSchema>;
export type OpeningHours = z.infer<typeof openingHoursSchema>;
export type EvidenceValue = z.infer<typeof evidenceValueSchema>;
export type ActivityClassification = z.infer<
  typeof activityClassificationSchema
>;
export type CafeFilterKey = z.infer<typeof cafeFilterKeySchema>;
export type ActivityFilterKey = z.infer<typeof activityFilterKeySchema>;
