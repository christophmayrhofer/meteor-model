import {Meteor} from "meteor/meteor"

export type MiddlewareArgument = null | Function | Function[]

let MeteorMethodClasses = {}

export function Persistable(middleware: MiddlewareArgument) {
    let decoratorName = arguments.callee.name
    return function (ClassConstructor: any) {
        let classIdentifier = generateIdentifier(ClassConstructor)
        MeteorMethodClasses[classIdentifier] = ClassConstructor
        validateMiddlewareArgument(middleware, decoratorName, classIdentifier)

        transformToMeteorMethod(ClassConstructor.prototype.save, middleware, ClassConstructor, "save")
        transformToMeteorMethod(ClassConstructor.prototype.delete, middleware, ClassConstructor, "delete")
    }
}

export function PubSub(middleware: MiddlewareArgument) {
    let decoratorName = arguments.callee.name
    return function (target: any, key: string, descriptor: PropertyDescriptor) {
        let publicationIdentifier = generateIdentifier(target, key)
        validateMiddlewareArgument(middleware, decoratorName, publicationIdentifier)
        if (Meteor.isServer) {
            Meteor.publish(publicationIdentifier, function (...args: any[]) {
                runMiddleware(middleware, decoratorName, publicationIdentifier, ...args)
                return descriptor.value(...args)
            })
        }
        else {
            descriptor.value = function (...args: any[]) {
                return Meteor.subscribe(publicationIdentifier, ...args)
            }
        }
    }
}

export function MeteorMethod(middleware: MiddlewareArgument) {
    let decoratorName = arguments.callee.name
    return function (target: any, key: string, descriptor: PropertyDescriptor) {
        let methodIdentifier = generateIdentifier(target.constructor, key)
        validateMiddlewareArgument(middleware, decoratorName, methodIdentifier)
        transformToMeteorMethod(descriptor.value, middleware, target, key)
    }
}

export function ServerOnly(target: any, key: string, descriptor: PropertyDescriptor) {
    let method = descriptor.value
    let methodIdentifier = generateIdentifier(target.constructor, key)
    descriptor.value = function (...args: any[]) {
        if (!Meteor.isServer) {
            throw Error(`Method ${methodIdentifier} can only be run on the server`)
        }
        method.apply(this, ...args)
    }
}

export function ClientOnly(target: any, key: string, descriptor: PropertyDescriptor) {
    let method = descriptor.value
    let methodIdentifier = generateIdentifier(target.constructor, key)
    descriptor.value = function (...args: any[]) {
        if (Meteor.isServer) {
            throw Error(`Method ${methodIdentifier} can only be run on the client`)
        }
        method.apply(this,...args)
    }
}

function generateIdentifier(ClassConstructor: any, methodName?: string, prefix?: string) {
    let name = __filename + '.'
    name += prefix ? prefix + '.' : ''
    name += ClassConstructor.name
    while ((ClassConstructor = Object.getPrototypeOf(ClassConstructor)) != Function.prototype && ClassConstructor) {
        name = `${ClassConstructor.name}.${name}`
    }
    if (methodName)
        return `${name}.${methodName}`
    return name
}

function transformToMeteorMethod(serverMethod: Function,
                                 middleware: MiddlewareArgument,
                                 affectedClass: any,
                                 methodName: string) {
    let methodIdentifier = generateIdentifier(affectedClass, methodName)
    let classIdentifier = generateIdentifier(affectedClass)
    MeteorMethodClasses[classIdentifier] = affectedClass

    if (Meteor.isServer) {
        Meteor.methods({
            [methodIdentifier]: function (modelProps: object, ...args: any[]) {
                runMiddleware(middleware, "MeteorMethod", methodIdentifier, ...args)
                let model = new MeteorMethodClasses[classIdentifier](modelProps)
                serverMethod.apply(model, ...args)
            },
        })
    }
    else {
        affectedClass.prototype[methodName] = async function (...args: any[]) {
            return new Promise((resolve, reject) => {
                Meteor.call(methodIdentifier, this, ...args, (error: any, result: any) => {
                    if (error) reject(error)
                    resolve(result)
                })
            })
        }
    }
}

function validateMiddlewareArgument(middleware: MiddlewareArgument, decoratorName: string, targetIdentifier: string) {
    let isValidMiddleware = middleware === null || middleware instanceof Function || middleware instanceof Array
    if (middleware === undefined) {
        throw Error(`No middleware specified for @${decoratorName} decorator on ${targetIdentifier}. 
            This is a potential security risk. Please pass a middleware function as a decorator argument or
            null if you are sure that you want to expose the save and delete methods without middleware.`)
    }
    if (!isValidMiddleware) {
        throw Error(`Invalid middleware defined for @${decoratorName} decorator on ${targetIdentifier}`)
    }
}

function runMiddleware(middleware: MiddlewareArgument, decoratorName: string, callerName: string, ...args: any[]) {
    if (middleware === undefined) {
        throw Error(`No middleware specified for ${decoratorName} decorator on ${callerName}. 
            This is a potential security risk. Please pass a middleware function as a decorator argument or
            null if you are sure that you want to expose the method without middleware.`)
    }
    if (middleware instanceof Array) {
        middleware.forEach(middleware => middleware(...args))
    }
    else if (middleware instanceof Function) {
        middleware(...args)
    }
    else if (middleware !== null) {
        throw Error(`Invalid middleware defined for ${decoratorName} decorator on ${callerName}.`)
    }
}
