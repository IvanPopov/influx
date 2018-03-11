import { ILogger, ELogLevel, ILoggerEntity } from "./idl/ILogger"
import { Logger } from "./util/logger"
import { isArray } from "./common";

export const logger: ILogger = new Logger();

logger.init();
logger.setUnknownCode(0, "unknown");
logger.setLogLevel(ELogLevel.ALL);

logger.registerCodeFamily(0, 100, "SystemCodes");

//Default log routines

function logRoutine(pLogEntity: ILoggerEntity): void {
    var pArgs: any[] = pLogEntity.info;

    console.log.apply(console, pArgs);
}

function warningRoutine(pLogEntity: ILoggerEntity): void {
    var pArgs: any[] = pLogEntity.info || [];
    if (!isArray(pArgs)) {
        pArgs = [pArgs];
    }

    {
        var sCodeInfo: string = "%cwarning" + (pLogEntity.code != 0 ? pLogEntity.code.toString() : "") + ":";
        pArgs.unshift(sCodeInfo, "color: red;");
    }
    console.warn.apply(console, pArgs);
}

function errorRoutine(pLogEntity: ILoggerEntity): void {
    var pArgs: any[] = pLogEntity.info || [];
    if (!isArray(pArgs)) {
        pArgs = [pArgs];
    }

    {
        var sMessage: string = pLogEntity.message;
        var sCodeInfo: string = "error" + (pLogEntity.code != 0 ? pLogEntity.code.toString() : "") + ":";
        pArgs.unshift("%c " + sCodeInfo, "color: red;", sMessage);
    }
    console.error.apply(console, pArgs);
}

logger.setLogRoutine(logRoutine, ELogLevel.LOG | ELogLevel.INFORMATION);
logger.setLogRoutine(warningRoutine, ELogLevel.WARNING);
logger.setLogRoutine(errorRoutine, ELogLevel.ERROR | ELogLevel.CRITICAL);
