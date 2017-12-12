import {Mongo} from "meteor/mongo"

export type Selector = object | string

export interface Collection<T> extends Mongo.Collection<T> {
    attachSchema ?: Function
}

export interface Schema {
    validate: Function
}

export interface SortOption {
    [key: string]: number
}

export interface FieldsOption {
    [key: string]: number
}

export interface FindOneOptions {
    sort ?: SortOption
    skip ?: number
    fields ?: FieldsOption
    reactive ?: boolean
    transform ?: Function
}

export interface FindOptions {
    sort ?: SortOption
    skip ?: number
    limit ?: number
    fields ?: FieldsOption
    reactive ?: boolean
    transform ?: Function
    disableOplog ?: boolean
    pollingIntervalMs ?: number
    pollingThrottleMs ?: number
    maxTimeMs ?: number
    hint ?: string | object
}