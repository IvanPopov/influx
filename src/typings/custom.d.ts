declare module "worker-loader!*" {
    class WebpackWorker extends Worker {
        constructor();
    }

    export default WebpackWorker;
}


declare module "raw-loader!*" {
    declare const value: string;

    export default value;
}
