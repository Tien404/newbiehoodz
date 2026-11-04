import { z } from "zod";
import {
  cafePlaceSchema,
  foodPlaceSchema,
  activityPlaceSchema,
} from "./placeSchemas.ts";

export const cloudinaryDeliverySchema = z.url().refine((value) => {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "res.cloudinary.com" &&
      url.pathname.includes("/image/upload/") &&
      !url.pathname.includes("/unassigned/") &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}, "Expected public Cloudinary image delivery");
export const publicPhotoSchema = z.strictObject({
  id: z.string().regex(/^img_[a-f0-9]{64}$/),
  src: cloudinaryDeliverySchema,
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  alt: z.string().nullable(),
  order: z.number().int().positive().nullable(),
});
const privateFields = {
  sourceIds: true,
  editorialStatus: true,
  images: true,
  coverAssetId: true,
} as const;
export const publicPlaceSchema = z.discriminatedUnion("category", [
  cafePlaceSchema
    .omit(privateFields)
    .extend({ photos: z.array(publicPhotoSchema) }),
  foodPlaceSchema
    .omit(privateFields)
    .extend({ photos: z.array(publicPhotoSchema) }),
  activityPlaceSchema
    .omit(privateFields)
    .extend({ photos: z.array(publicPhotoSchema) }),
]);
export type PublicPlace = z.infer<typeof publicPlaceSchema>;
export type PublicPhoto = z.infer<typeof publicPhotoSchema>;
export type PublicCafe = Extract<PublicPlace, { category: "cafe" }>;
export type PublicFood = Extract<PublicPlace, { category: "food" }>;
export type PublicActivity = Extract<PublicPlace, { category: "activity" }>;
