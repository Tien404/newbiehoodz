import { z } from "zod";

const text = z
  .string()
  .refine((value) => value.trim().length > 0, "Must contain text");
const sha256 = z.string().regex(/^[a-f0-9]{64}$/);
const cellAddress = z.string().regex(/^[A-Z]{1,3}[1-9][0-9]*$/);
// New pipeline IDs are deterministic UUIDv5; accept legacy v4 references too.
const placeId = z
  .string()
  .regex(
    /^plc_[0-9a-f]{8}-[0-9a-f]{4}-[45][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
const sourceId = z
  .string()
  .regex(
    /^src_[0-9a-f]{8}-[0-9a-f]{4}-[45][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
const assetId = z.string().regex(/^img_[a-f0-9]{64}$/);
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const evidenceValueSchema = z.enum(["yes", "no", "unknown"]);
export const activityFacetSchema = z.enum([
  "culture",
  "outdoors",
  "markets",
  "night-out",
]);

/** Exact source statement plus optional reviewed interpretation. Never coercively parse prices. */
export const priceSchema = z.strictObject({
  text,
  currency: z.literal("VND"),
  amount: z.discriminatedUnion("kind", [
    z.strictObject({ kind: z.literal("unparsed") }),
    z.strictObject({ kind: z.literal("free"), value: z.literal(0) }),
    z.strictObject({
      kind: z.literal("minimum"),
      value: z.number().finite().nonnegative(),
    }),
    z
      .strictObject({
        kind: z.literal("range"),
        min: z.number().finite().nonnegative(),
        max: z.number().finite().nonnegative(),
      })
      .refine((value) => value.min <= value.max, "Price range is inverted"),
  ]),
});

export const openingHoursSchema = z.strictObject({
  text,
  interpretation: z.enum(["unparsed", "open-24-7"]),
});

/** Known list semantics differ from a missing/uncategorized list. */
export const activityClassificationSchema = z.discriminatedUnion("status", [
  z.strictObject({ status: z.literal("unclassified") }),
  z.strictObject({
    status: z.literal("reviewed"),
    values: z
      .array(activityFacetSchema)
      .refine(
        (values) => new Set(values).size === values.length,
        "Duplicate activity facets",
      ),
  }),
]);

export const placeImageSchema = z.strictObject({
  assetId,
  order: z.number().int().positive(),
  alt: text.nullable(),
  caption: text.nullable(),
  mapping: z.enum(["candidate", "owner-confirmed"]),
});

export const imageAssetSchema = z
  .strictObject({
    id: assetId,
    sha256,
    bytes: z.number().int().positive(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    format: z.enum([
      "jpeg",
      "png",
      "webp",
      "gif",
      "avif",
      "tiff",
      "bmp",
      "heic",
      "heif",
    ]),
    rights: z.strictObject({
      status: z.enum(["unknown", "approved", "restricted"]),
      credit: text.nullable(),
      evidence: text.nullable(),
    }),
    // No raw local file path or Google Drive folder is a deliverable website image URL.
    delivery: z
      .strictObject({
        src: z
          .string()
          .regex(/^\/media\/[a-zA-Z0-9/_-]+\.(?:jpg|jpeg|png|webp|avif|gif)$/),
        width: z.number().int().positive(),
        height: z.number().int().positive(),
      })
      .nullable(),
  })
  .refine(
    (value) => value.id === `img_${value.sha256}`,
    "Asset ID must equal its content hash",
  );

const commonPlaceShape = {
  id: placeId,
  slug,
  name: text,
  englishName: text.nullable(),
  address: text,
  mapsUrl: z.httpUrl().refine((value) => {
    const host = new URL(value).hostname;
    return (
      ["maps.app.goo.gl", "maps.google.com", "goo.gl"].includes(host) ||
      (["google.com", "www.google.com"].includes(host) &&
        new URL(value).pathname.startsWith("/maps"))
    );
  }, "Expected a Google Maps HTTP(S) URL"),
  summary: text.nullable(),
  openingHours: openingHoursSchema.nullable(),
  sourceIds: z
    .array(sourceId)
    .min(1)
    .refine(
      (values) => new Set(values).size === values.length,
      "Duplicate sources",
    ),
  editorialStatus: z.enum(["draft", "reviewed"]),
  images: z.array(placeImageSchema),
  coverAssetId: assetId.nullable(),
};

export const cafePlaceSchema = z.strictObject({
  ...commonPlaceShape,
  category: z.literal("cafe"),
  cafe: z.strictObject({
    district: text,
    minimumDrinkPrice: priceSchema.nullable(),
    noiseDescription: text.nullable(),
    seatingDescription: text.nullable(),
    soloStudy: evidenceValueSchema,
    groupStudy: evidenceValueSchema,
    longStay: evidenceValueSchema,
    airConditioning: evidenceValueSchema,
    parking: evidenceValueSchema,
    parkingFeeText: text.nullable(),
    busyTimesText: text.nullable(),
    recommendedVisitText: text.nullable(),
    recommendationText: text.nullable(),
    facets: z.strictObject({
      quiet: z.enum(["yes", "no"]),
      openLate: evidenceValueSchema,
      budget: evidenceValueSchema,
    }),
  }),
});

export const foodPlaceSchema = z.strictObject({
  ...commonPlaceShape,
  category: z.literal("food"),
  food: z.strictObject({
    diningTypeText: text.nullable(),
    dietaryDescription: text.nullable(),
    areaText: text.nullable(),
    nearbyCampusText: text.nullable(),
    recommendedDishText: text.nullable(),
    pricePerPerson: priceSchema.nullable(),
    closedDaysText: text.nullable(),
    ingredientsText: text.nullable(),
    orderingText: text.nullable(),
    paymentText: text.nullable(),
    serviceModeText: text.nullable(),
  }),
});

export const activityPlaceSchema = z.strictObject({
  ...commonPlaceShape,
  category: z.literal("activity"),
  activity: z.strictObject({
    typeText: text.nullable(),
    historicalContext: text.nullable(),
    citySignificance: text.nullable(),
    experiencesText: text.nullable(),
    admissionPrice: priceSchema.nullable(),
    suggestedDurationText: text.nullable(),
    recommendedVisitText: text.nullable(),
    visitorNotes: text.nullable(),
    classification: activityClassificationSchema,
    budgetTier: z.enum(["free", "one", "two", "three"]).nullable(),
  }),
});

export const placeSchema = z.discriminatedUnion("category", [
  cafePlaceSchema,
  foodPlaceSchema,
  activityPlaceSchema,
]);

/** Private build-time provenance sidecar: never import it into page/client code. */
export const excelSourceSchema = z
  .strictObject({
    id: sourceId,
    workbookPath: text,
    workbookSha256: sha256,
    sheet: text,
    row: z.number().int().positive(),
    nameCell: cellAddress,
    inclusion: z.enum(["include", "exclude-by-owner"]),
    ownerDecision: text.nullable(),
    cells: z.record(
      cellAddress,
      z.strictObject({
        header: text.nullable(),
        rawValue: z.string(),
        storedType: z.enum(["s", "inlineStr", "str", "n", "b", "e", "d"]),
        numberFormat: text.nullable(),
        formula: z.string().nullable(),
        formulaAttributes: z.record(z.string(), z.string()).nullable(),
        hyperlinkTargets: z.array(z.httpUrl()),
      }),
    ),
    fieldMappings: z.record(
      text,
      z.strictObject({
        cells: z.array(cellAddress).min(1),
        method: z.enum(["verbatim", "reviewed-interpretation"]),
        note: text.nullable(),
      }),
    ),
    informationSourceText: text.nullable(),
    imageSourceText: text.nullable(),
    sourceUpdatedText: text.nullable(),
    responsibleEditorText: text.nullable(),
  })
  .superRefine((source, ctx) => {
    for (const address of [source.nameCell, ...Object.keys(source.cells)]) {
      if (Number(address.replace(/^[A-Z]+/, "")) !== source.row) {
        ctx.addIssue({
          code: "custom",
          path: ["cells"],
          message: "Cell row differs from source row",
        });
      }
    }
    if (!(source.nameCell in source.cells)) {
      ctx.addIssue({
        code: "custom",
        path: ["nameCell"],
        message: "Missing original name cell",
      });
    }
    for (const [field, mapping] of Object.entries(source.fieldMappings)) {
      if (mapping.cells.some((cell) => !(cell in source.cells))) {
        ctx.addIssue({
          code: "custom",
          path: ["fieldMappings", field],
          message: "Mapping references a missing raw cell",
        });
      }
    }
    if (source.inclusion === "exclude-by-owner" && !source.ownerDecision) {
      ctx.addIssue({
        code: "custom",
        path: ["ownerDecision"],
        message: "Exclusion requires owner evidence",
      });
    }
  });

export const assetSourceSchema = z.strictObject({
  assetId,
  files: z
    .array(
      z.strictObject({
        path: text,
        filename: text,
        extension: text,
        driveFileId: text.nullable(),
        driveFolderUrl: z.httpUrl().nullable(),
      }),
    )
    .min(1),
});

const catalogShape = {
  schemaVersion: z.literal(1),
  places: z.array(placeSchema),
  assets: z.array(imageAssetSchema),
};

export const placeCatalogSchema = z
  .strictObject(catalogShape)
  .superRefine((catalog, ctx) => {
    const ids = new Set<string>();
    const slugs = new Set<string>();
    const assets = new Set<string>();
    for (const [index, asset] of catalog.assets.entries()) {
      if (assets.has(asset.id))
        ctx.addIssue({
          code: "custom",
          path: ["assets", index, "id"],
          message: "Duplicate asset",
        });
      assets.add(asset.id);
    }
    for (const [index, place] of catalog.places.entries()) {
      const fail = (message: string) =>
        ctx.addIssue({ code: "custom", path: ["places", index], message });
      if (ids.has(place.id)) fail("Duplicate place ID");
      if (slugs.has(place.slug)) fail("Duplicate global slug");
      ids.add(place.id);
      slugs.add(place.slug);
      const imageIds = new Set<string>();
      for (const [position, image] of place.images.entries()) {
        if (!assets.has(image.assetId)) fail("Image references missing asset");
        if (imageIds.has(image.assetId))
          fail("Same asset repeated in one gallery");
        if (image.order !== position + 1)
          fail("Image order must be contiguous and match array order");
        imageIds.add(image.assetId);
      }
      if (place.coverAssetId !== null && !imageIds.has(place.coverAssetId))
        fail("Cover is not a gallery image");
      if (
        place.category === "cafe" &&
        place.cafe.minimumDrinkPrice &&
        !["unparsed", "minimum"].includes(
          place.cafe.minimumDrinkPrice.amount.kind,
        )
      )
        fail("Cafe price must preserve minimum-drink semantics");
      if (
        place.category === "activity" &&
        place.activity.budgetTier === "free" &&
        place.activity.admissionPrice?.amount.kind !== "free"
      )
        fail("Free badge needs reviewed free admission");
    }
  });

export const placeDataBundleSchema = z
  .strictObject({
    catalog: placeCatalogSchema,
    provenance: z.strictObject({
      sources: z.array(excelSourceSchema),
      assets: z.array(assetSourceSchema),
    }),
  })
  .superRefine((bundle, ctx) => {
    const sources = new Map(
      bundle.provenance.sources.map((source) => [source.id, source]),
    );
    const assets = new Set(bundle.catalog.assets.map((asset) => asset.id));
    const assetSources = new Set(
      bundle.provenance.assets.map((asset) => asset.assetId),
    );
    if (sources.size !== bundle.provenance.sources.length)
      ctx.addIssue({
        code: "custom",
        path: ["provenance", "sources"],
        message: "Duplicate source ID",
      });
    if (assetSources.size !== bundle.provenance.assets.length)
      ctx.addIssue({
        code: "custom",
        path: ["provenance", "assets"],
        message: "Duplicate asset provenance",
      });
    for (const [index, place] of bundle.catalog.places.entries()) {
      for (const id of place.sourceIds) {
        const source = sources.get(id);
        if (!source || source.inclusion !== "include")
          ctx.addIssue({
            code: "custom",
            path: ["catalog", "places", index, "sourceIds"],
            message: "Missing or owner-excluded source",
          });
      }
    }
    for (const id of assets)
      if (!assetSources.has(id))
        ctx.addIssue({
          code: "custom",
          path: ["provenance", "assets"],
          message: "Asset lacks original-file provenance",
        });
    for (const id of assetSources)
      if (!assets.has(id))
        ctx.addIssue({
          code: "custom",
          path: ["provenance", "assets"],
          message: "Provenance references missing asset",
        });
  });

/** Separate editorial gate: valid draft structure is not permission to publish. */
export const publishableCatalogSchema = placeCatalogSchema.superRefine(
  (catalog, ctx) => {
    const assets = new Map(catalog.assets.map((asset) => [asset.id, asset]));
    for (const [index, place] of catalog.places.entries()) {
      const fail = (message: string) =>
        ctx.addIssue({ code: "custom", path: ["places", index], message });
      if (place.editorialStatus !== "reviewed")
        fail("Content review is pending");
      if (!place.images.length || !place.coverAssetId)
        fail("Choose at least one image and a cover");
      if (place.images.length && place.coverAssetId !== place.images[0].assetId)
        fail("Cover must be the first image in source-folder order");
      if (place.category === "activity" && !place.summary)
        fail("Activity card requires its source summary");
      for (const image of place.images) {
        const asset = assets.get(image.assetId);
        if (!image.alt || image.mapping !== "owner-confirmed")
          fail("Image alt or branch mapping is unreviewed");
        if (
          !asset?.delivery ||
          asset.rights.status !== "approved" ||
          !asset.rights.evidence
        )
          fail("Image delivery or usage approval is pending");
      }
    }
  },
);

export const cafeFilterKeySchema = z.enum([
  "all",
  "quiet",
  "open-late",
  "budget",
]);
export const activityFilterKeySchema = z.enum([
  "all-quests",
  "culture",
  "outdoors",
  "markets",
  "night-out",
]);
