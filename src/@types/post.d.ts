type post = {
    Server: import('./../pushserver').Pushserver;
    Token: string;
    Notify: notify;
    Image: b46Uri;
    ImageUrl: string;
}

type notify = {
    Alert : alert;
    Action?: string;
}

type alert = {
    Title: string;
    Body: string;
}