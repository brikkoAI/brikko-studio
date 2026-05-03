/** Root BrikkoStudio configuration Zod schema — the full `brikko-studio.json` shape. */
export { BrikkoStudioSchema } from "../config/zod-schema.js";
export { validateJsonSchemaValue } from "../plugins/schema-validator.js";
export type { JsonSchemaObject } from "../shared/json-schema.types.js";
