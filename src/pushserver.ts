export enum Pushserver {
    Apple = "apple.com",
    Google = "googleapis.com"
}
 
export interface IApplePushOptions {
    KeyPath : string;
    KeyId : string;
    TeamId : string;
    Production? : boolean;
}

export interface IGooglePushOptions {
    AuthorizationToken: string;
}