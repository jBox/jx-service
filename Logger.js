const log4js = require("log4js");
const Path = require("path");
const fs = require("fs-extra");
const uuid = require("uuid/v4");

class Logger {
    static init(logs) {
        log4js.configure({
            appenders: {
                out: { type: 'console' },
                info: {
                    type: "file",
                    filename: Path.resolve(logs, "./info.log"),
                    maxLogSize: 10 * 1024 * 1024, // = 10Mb
                    numBackups: 5, // keep five backup files
                    compress: true, // compress the backups
                    encoding: "utf-8",
                    mode: parseInt("0640", 8),
                    flags: "a"
                },
                error: {
                    type: "file",
                    filename: Path.resolve(logs, "./error.log"),
                    maxLogSize: 10 * 1024 * 1024, // = 10Mb
                    numBackups: 5, // keep five backup files
                    compress: true, // compress the backups
                    encoding: "utf-8",
                    mode: parseInt("0640", 8),
                    flags: "a"
                }
            },
            categories: {
                default: { appenders: ['out'], level: 'info' },
                info: { appenders: ['info'], level: 'info' },
                error: { appenders: ['error'], level: 'error' }
            }
        });
    }

    error(err) {
        err = err || {};
        const guid = uuid();
        const logger = log4js.getLogger("error");
        const errs = ["message", "stack"].reduce((es, key) => {
            es.push(`${key}: ${err[key]}`);
            return es;
        }, [guid]);
        errs.push("------------------------------\n");
        logger.error(errs.join("\n"));
        return guid;
    }

    info(msg) {
        const guid = uuid();
        const logger = log4js.getLogger("info");
        logger.info(msg);
        return guid;
    }
}

module.exports = Logger;