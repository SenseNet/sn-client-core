import {GenericContent, Schema, SchemaStore as DefaultSchemaStore} from "@sensenet/default-content-types";

/**
 * Class that stores schema information
 */
export class SchemaStore {

    constructor(private schemas: Schema[] = DefaultSchemaStore.map((s) => s)) {

    }
    private byNameSchemaCache: Map<string, Schema>;

    /**
     * Updates the schema information in the store and inv
     */
    public SetSchemas(newSchemas: Schema[]) {
        this.schemas = newSchemas;
        this.byNameSchemaCache = new Map<string, Schema>();
    }

    /**
     * Returns the Content Type Schema for the provided Content Type;
     * @param type {string} The name of the Content Type;
     * @returns {Schemas.Schema}
     * ```ts
     * var genericContentSchema = SenseNet.Content.getSchema(Content);
     * ```
     */
    public GetSchema<TType>(currentType: { new(...args: any[]): TType }): Schema {
        return this.GetSchemaByName(currentType.name);
    }

    /**
     * Returns the Content Type Schema for the provided content type name
     * @param {string} contentTypeName The name of the content type
     */
    public GetSchemaByName(contentTypeName: string) {
        if (!this.byNameSchemaCache) {
            this.byNameSchemaCache = new Map<string, Schema>();
        }

        if (this.byNameSchemaCache.has(contentTypeName)) {
            return Object.assign({}, this.byNameSchemaCache.get(contentTypeName)) as Schema;
        }
        let schema = this.schemas.find((s) => s.ContentTypeName === contentTypeName) as Schema;
        if (!schema) {
            return this.GetSchema(GenericContent);
        }
        schema = Object.assign({}, schema);
        const parentSchema = schema.ParentTypeName && this.GetSchemaByName(schema.ParentTypeName);

        if (parentSchema) {
            schema.FieldSettings = [...schema.FieldSettings, ...parentSchema.FieldSettings];
        }
        this.byNameSchemaCache.set(contentTypeName, schema);
        return schema;
    }
}
