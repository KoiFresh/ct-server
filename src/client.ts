import expressWs from 'express-ws';
import ws from 'express-ws';
import { IncomingMessage } from 'http';

export class client{
    registry: string;
    channel: any;
    pushImage: PushImage | undefined = undefined; 

    constructor(registry: string, wsocket: any) {
        this.registry = registry;
        this.channel = wsocket;
    }

    private isListed(key: string ,keys: string[]): boolean {
        let result: boolean = false;
        for(let i: number = 0; i < keys.length; i++) {
            if(key == keys[i]) {
                result = true;
            }
        }
        return result;
    }

    /*
    *   Prüfen ob das Registry des Clients in einer Whitelist enthalten ist.
    */
    public isWhitelisted(keys: string[]) : boolean {
        return this.isListed(this.registry, keys);
    }

    /*
    *   Prüfen ob das Registry des Clients in einer Blacklist enthalten ist.
    */
    public isBlacklisted(keys: string[]) : boolean {
        return this.isListed(this.registry, keys);
    }
}

export class PushImage {
    file: Buffer;
    key: string;

    constructor(file: Buffer, key: string) {
        this.file = file;
        this.key = key;
    }
}