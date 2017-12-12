import {plainToClass} from "class-transformer"
import MeteorCollection from './MeteorCollection'
import {ServerOnly} from './MeteorModelDecorators'

export default class MeteorModel extends MeteorCollection {

    _id: String

    constructor(args = {}) {
        super()
        if (args.constructor === Object && Object.keys(args).length > 0) {
            let instance = plainToClass(<typeof MeteorModel>this.constructor, args)
            instance.validate()
            return instance
        }
    }

    validate() {
        if (!this.Class.$schema) return
        this.Class.$schema.validate(this)
    }

    @ServerOnly
    async delete() {
        if (!this._id) return
        this.Class.$collection.remove(this._id)
    }

    @ServerOnly
    async save() {
        this.validate()
        this._id ? this.update() : await this.create()
    }

    @ServerOnly
    private async update() {
        this.Class.$collection.update(this._id, {$set: this})
    }

    @ServerOnly
    private async create() {
        this._id = this.Class.$collection.insert(this)
    }

    private get Class() {
        return <typeof MeteorModel>this.constructor
    }
}

