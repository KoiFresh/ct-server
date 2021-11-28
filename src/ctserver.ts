import { client1, CtClient } from "./ctclient";
import express, {Application, Request, Response, NextFunction} from "express";
import ws, { WebsocketRequestHandler } from 'express-ws';
import { WebSocket } from "ws";
import { PushNotification } from "./notification";

/**
 * provides the base class for the sever application
 * @author Kai Mayer 
 * @version 1
 * @alpha
 * if this server is run on dev.ct.dieklingel.com then it is not secure to use it. It is in a proof of concept mode, where we try things and change them
 * on demand. It is recommended to use the ct.dieklingel.com server. 
 * every method market as @alpha is in try mode, so it could be removed for some reason, or stop working some day, or worser has never worked correctly
 */

const _200_PUSH_SUCCESFULL : string = "200 : The message was successfully pushed";
const _400_PUSH_ABORTED : string = "400 : The message was aborted because of an bad request"; 
const _401_MISSING_CLIENT_REGISTRY : string = "401 : The request could not be authenticated";
const _404_CLIENT_NOT_FOUND : string = "404 : The requested client could not be found on this server";
const _406_NO_IMAGE_AVAILABLE : string = "406 : For the requested client is no image available";

export class CtServer {
    private app: Application = express();
    private router: ws.Router = <ws.Router>express.Router();
    private clients : CtClient[] = new Array();
    private singlestream : any;

    constructor() {
        // add websocket compatibility to the express router https://www.npmjs.com/package/express-ws
        ws(this.app);
        // add middleware for the express app
        this.app.use(express.json({limit: '50MB'}));
        this.app.use(express.text({limit: '50MB'}));
        //this.app.use(express.raw({type: 'image/png'}));
        /**
         * handles http requests for path /
         */
        this.router.get("/", (req: Request, res: Response) => {
            res.send("none");
            //res.send(JSON.stringify(this.clients));
        });

        /**
         * subscribe for push notifications
         */
        this.router.ws("/push/subscribe", this.wsPushSubscribe );

        /**
         * @alpha
         * send images over websocket stream
         */
        this.router.post("/media/stream/send", this.postMediaStreamSend);

        /**
         * post message on the gateway
         */
        this.router.post("/gateway/post", this.postGatewayPost);

        /**
         * post push notification
         */
        this.router.post("/push/post", this.postPushPost);

        /**
         * get the preview image from a client
         */
        this.router.get("/client/preview", this.getClientPreview);

        /**
         * @deprecated
         * @author Kai Mayer
         * outdated since 2021-10-15
         * replaced by /push/post
         */
        this.router.post("/image/*", (req: Request, res: Response) : void => {
            let registry : string | undefined = req.header("Token") ?? req.query.Token?.toString();
            if( registry !== undefined ) {
                let exists : CtClient | undefined = this.clients.find((element : CtClient) => element.isRegisterd && element.registry === registry);
                if(exists !== undefined) {
                    if(req.body.body.data != undefined) {
                        exists.imageUri = Buffer.from(req.body.body.data ,"base64");
                    }   
                }
            }
            res.status(418).send("I am a Teapot, go find someone who makes coffee - This method is deprecated use /push/post instead");
        });

        /**
         * @deprecated
         * @author Kai Mayer
         * outdated since 2021-10-15
         * replaced by /gateway/post
         */
        this.router.post("/",this.postGatewayPost);
        
        /**
         * @deprecated
         * @author Kai Mayer
         * outdated since 2021-10-15
         * replaced by /push/post
         */
        this.router.post("/pushservice", this.postPushPost);

        /**
         * handle 404 not found get request
         */
        this.router.get("*", (req: Request, res: Response) => {
            res.status(404).send("404 NOT FOUND Exception");
        });
    }

    /**
     * handles ws requests for a doorunit channel push subscribtion 
     * path: /push/subscribe
     */
    private wsPushSubscribe = (ws: WebSocket , req: Request) : void => {
        let client : CtClient = new CtClient(ws);
        client.socket?.once("message", (message) => {
            let exists : CtClient | undefined = this.clients.find((element : CtClient) => element.isRegisterd && element.registry === client.registry);
            if(exists === undefined) {
                this.clients.push(client);
            }else {
                client.socket?.close();
            }
        });
        client.socket?.once("close", () => {
            let index = this.clients.indexOf(client) 
            if(index > -1) {
                this.clients.splice(index, 1);
            }
        });
    }

    /**
     * handles the webosocket request for uploading the livestream
     * @alpha
     */
    private postMediaStreamSend = (req: Request, res: Response) : void => {
        //let imgs : b46Uri[] = (<string>req.body).split("\n");
        //console.log(imgs.length);
        this.singlestream = Buffer.from(req.body, "base64");//Buffer.from(req.body);
        //this.singlestream = req.body;
        /*for(let i = 0; i < this.singlestream.length; i++) 
        {
            this.singlestream[i] = (this.singlestream[i] == 255) ? 0 : this.singlestream[i];
        } */
        //console.log(this.singlestream[13]);
        res.send("");  
    }

    /**
     * handles post requests for posting a message on the gateway
     * path: /gateway/post
     */
    private postGatewayPost = (req: Request, res: Response) : void => {
        let registry : string | undefined = req.header("Token") ?? req.query.Token?.toString();
        console.log("Post on Gateway", registry);
        if( registry !== undefined ) {
            let exists : CtClient | undefined = this.clients.find((element : CtClient) => element.isRegisterd && element.registry === registry);
            if(exists !== undefined) {
                console.log("client exists: wait for response");
                exists.socket?.once("message", (message) => {
                    console.log("200", _200_PUSH_SUCCESFULL, registry);
                    res.send(message);
                })
                exists.socket?.send(req.body);
            } else {
                /**
                 * @author Kai Mayer
                 * no we are at some critical point 
                 * describtion: 
                 * there could be thousends of instances runnig in the world wide web ... so its possible for each doorunit to be
                 * connected to a differnt one then the instance the gateway request was send to. In this case it should be 
                 * possible to send the request to the next ct-server, which runs hopefully with the same source code than this 
                 * and the instance can look if the doorunit is connected to himself, if we go one step deeper and repeate the process. 
                 * Thats the idear of forwarding a message throug a network of trusted ct-servers. So also an untrusted ct-server could send to an trusted 
                 * ct-server, but an trusted ct-server would only forward to a set of other trusted ct-server. In this case it is possible to run your ct-server fully at home
                 * and only use this server to forward messages, the same we could do on an image request, here the problem is, you would never reach an untrusted server, since 
                 * someone is setting up a trusted server and connect it to a single or worser a couple of untrusted servers. 
                 * Another point is, that if two instances of ct-server are connected to each other and the doorunit is connected to none of them, we end in endless recursion. 
                 * and at this moment i think it is not a really goot idea to buidl a network of servers ... maybe in the future
                 * solution: 
                 * send back a not found response
                 */
                console.log("404", _404_CLIENT_NOT_FOUND, registry);
                res.status(404).send(_404_CLIENT_NOT_FOUND);
            }
        }else {
            console.log("401", _401_MISSING_CLIENT_REGISTRY);
            res.status(401).send(_401_MISSING_CLIENT_REGISTRY);
        }
    }

    /**
     * handles get requests for posting a push message to the app 
     * path: /push/post
     */
    private postPushPost = (req: Request , res: Response) : void => {
        let registry : string | undefined = req.header("Token");
        let post : post = <post>req.body;
        if(registry !== undefined) {
            let exists : CtClient | undefined = this.clients.find((element : CtClient) => element.isRegisterd && element.registry === registry);
            if(exists !== undefined && exists.isRegisterd) {
                if(post.Image !== undefined) {
                    console.log("image was here");
                    exists.imageUri = Buffer.from(post.Image, "base64");
                }
                post.ImageUrl = "https://" + req.headers.host + "/client/preview?Token=" + exists.registry;
            }
        }
        let notification : PushNotification  = new PushNotification(post);
        if(notification.push()) {
            res.status(200).send(_200_PUSH_SUCCESFULL);
        }else {
            res.status(400).send(_400_PUSH_ABORTED);
        }
    }

    /**
     * handles get request for image download 
     * path: /client/preview
     */
    private getClientPreview = (req: Request, res: Response) : void => {
        let registry : string | undefined = req.header("Token") ?? req.query.Token?.toString();
        if( registry !== undefined ) {
            let exists : CtClient | undefined = this.clients.find((element : CtClient) => element.isRegisterd && element.registry === registry);
            if(exists !== undefined) {
                if(exists.imageUri.length > 0) {
                    res.writeHead(200, {"Content-Type":"image/png"});
                    res.end(exists.imageUri);
                }else {
                    res.status(406).send(_406_NO_IMAGE_AVAILABLE);
                }
            }else {
                res.status(404).send(_404_CLIENT_NOT_FOUND);
            }
        }else {
            res.status(401).send(_401_MISSING_CLIENT_REGISTRY);
        }
    }

    /**
     * starts the server application
     * @param port runs the server on the given port 
     */
    public run(port: number) : void {
        this.app.use("/", this.router);
        this.app.listen(port);
    }

    
}