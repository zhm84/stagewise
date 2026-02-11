import { z } from 'zod';

const boundingClientRectSchema = z.object({
  top: z.number(),
  left: z.number(),
  height: z.number(),
  width: z.number(),
});
const pluginInfoItemSchema = z.object({
  pluginName: z.string(),
  content: z.string(),
});
const baseSelectedElementSchema = z.object({
  nodeType: z.string(),
  xpath: z.string(),
  attributes: z.record(z.union([z.string(), z.boolean(), z.number()])),
  textContent: z.string(),
  ownProperties: z.record(z.any()),
  boundingClientRect: boundingClientRectSchema,
  pluginInfo: z.array(pluginInfoItemSchema),
});

export type SelectedElement = z.infer<typeof baseSelectedElementSchema> & {
  parent?: SelectedElement;
};

export const selectedElementSchema: z.ZodType<SelectedElement> =
  baseSelectedElementSchema.extend({
    parent: z.lazy(() => selectedElementSchema).optional(),
  }) as z.ZodType<SelectedElement>;

export const userMessageMetadataSchema = z.object({
  currentUrl: z.string().url().nullable(),
  currentTitle: z.string().nullable(),
  currentZoomLevel: z.number(),
  viewportMinScale: z.number().optional(),
  viewportMaxScale: z.number().optional(),
  viewportResolution: z.object({
    width: z.number().min(0),
    height: z.number().min(0),
  }),
  devicePixelRatio: z.number(),
  userAgent: z.string(),
  locale: z.string(),
  selectedElements: z.array(selectedElementSchema),
});

export const userMessageContentItemSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), text: z.string() }),
  z.object({
    type: z.literal('image'),
    mimeType: z.string(),
    data: z.string(),
  }),
]);

export const userMessageSchema = z.object({
  id: z.string(),
  contentItems: z.array(userMessageContentItemSchema),
  createdAt: z
    .union([z.string(), z.date()])
    .transform((v) => (typeof v === 'string' ? new Date(v) : v)),
  metadata: userMessageMetadataSchema,
  pluginContent: z.record(z.record(userMessageContentItemSchema)),
  sentByPlugin: z.boolean(),
});

export type UserMessage = z.infer<typeof userMessageSchema>;
export type UserMessageMetadata = z.infer<typeof userMessageMetadataSchema>;
export type UserMessageContentItem = z.infer<
  typeof userMessageContentItemSchema
>;
