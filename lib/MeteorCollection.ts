import {Collection, Schema, FindOneOptions, FindOptions, Selector} from "./MeteorCollectionTypings"
import {Mongo} from 'meteor/mongo'

export default abstract class MeteorCollection {
    private static _$collection: Collection<any>
    private static _$schema ?: Schema | null

    static get $collection() {
        return this._$collection
    }

    static set $collection(collection: Collection<any>) {
        this._$collection = collection
        if(this.$schema && this.$collection && this.$collection.attachSchema) {
            try { this.$collection.attachSchema(this.$schema) } catch(err) {}
        }
    }

    static get $schema() {
        return this._$schema
    }

    static set $schema(schema: Schema | null | undefined) {
        this._$schema = schema
        if(this.$collection && this.$schema && this.$collection.attachSchema) {
            try { this.$collection.attachSchema(this.$schema) } catch(err) {}
        }
    }

    static findOne<T extends MeteorCollection>(
        this: typeof MeteorCollection & (new (arg: any, ...args: any[]) => T),
        selector: Selector = {}, options: FindOneOptions = {}
    ) {
        let item = this.$collection.findOne(selector, options)
        return new this(item)
    }

    static find(selector: Selector = {}, options: FindOptions = {}) {
        return this.$collection.find(selector, options)
    }

    static fetch<T extends MeteorCollection>(
        this: typeof MeteorCollection & (new (arg: any, ...args: any[]) => T),
        cursor: any
    ) {
        return cursor.map((item: object) => new this(item))
    }

    static remove(selector: Selector) {
        this.$collection.remove(selector)
    }

    static insert(doc: object) {
        this.$collection.insert(doc)
    }

    static upsert(selector: Selector, values: object, multi: boolean) {
        this.$collection.upsert(selector, {$set: values})
    }

    static update(selector: Selector, values: object, multi: boolean) {
        this.$collection.update(selector, {$set: values}, {multi})
    }

    static replace(selector: Selector, values: object, multi: boolean) {
        this.$collection.update(selector, values, {multi})
    }
}