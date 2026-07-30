export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonObject | JsonArray
export type JsonObject = Readonly<{ [key: string]: JsonValue }>
export type JsonArray = readonly JsonValue[]
