import { WebSocket } from "ws";

/**
 * represents a doorunit client, connected to the server over ws
 * @author Kai Mayer
 * @version 1
 */

export class CtClient {
    private _imageUri : Buffer = Buffer.alloc(0);
    private _registry : string = "";
    private _isRegisterd : boolean = false;
    private _socket : WebSocket | undefined = undefined;

    constructor(socket? : WebSocket) {
        if(socket !== undefined) {
            this.socket = socket;
        }
    }

    /**
     * set the image uri 
     */
    public set imageUri(uri: Buffer) {
        this._imageUri = uri;
    }

    /**
     * get the image uri
     */
    public get imageUri() : Buffer {
        return this._imageUri;
    }

    /**
     * set the registry token
     */
    public set registry(registry: string) {
        this.registry = registry;
    }

    /**
     * get the registry token
     */
    public get registry() : string {
        return this._registry;
    }

    /**
     * set the socket
     */
    public set socket(socket : WebSocket | undefined) {
        this._socket = socket;
        if(this._socket !== undefined) {
            this._socket.once("message", (message) => {
                // first message
                this._registry = message.toString();
                this._isRegisterd = true;
                console.log("[ctclient.ts] new client with registry ", this._registry , " connected");
            });
            this._socket.on("close", () => {
                this._isRegisterd = false;
                console.log("[ctclient.ts] client with registry ", this._registry, " disconnected");
            });
        }
    } 

    /**
     * get the socket
     */
    public get socket() : WebSocket | undefined {
        return this._socket;
    }

    /**
     * get the registerd state
     */
    public get isRegisterd() : boolean {
        return this._isRegisterd;
    }
}

export class client1{
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