const level = require("level");
const Path = require("path")
const fs = require("fs-extra");
const sharp = require("sharp");
const { fixNum } = require("../utils");

const indicateIdentity = (instance) => {
    return new Promise((resolve, reject) => {
        let key = "000000000000";
        return instance.createReadStream({ reverse: true, limit: 1 })
            .on("data", (data) => (key = data.key))
            .on("error", (error) => reject(error))
            .on("end", () => {
                const identity = Number(key.substr(4));
                console.log(`Images indicate identity: ${identity}.`);
                resolve(identity);
            });
    });
};

const INIT_ID = -1;

const db = {
    MAX_ID: INIT_ID,
    instance: null,
    nextIdentity() {
        if (db.MAX_ID > INIT_ID) {
            return Promise.resolve(++db.MAX_ID);
        }

        return indicateIdentity(db.instance).then((id) => {
            if (db.MAX_ID === INIT_ID) {
                db.MAX_ID = id;
            }

            return ++db.MAX_ID;
        });
    },
    generateImageId(identity) {
        const now = new Date();
        const timeline = `${now.getFullYear()}}`;
        return `${timeline}${fixNum(identity, 8)}`;
    }
};



class ImageService {
    constructor(dataDir) {
        const DB_DIR = Path.resolve(dataDir, "./db");
        fs.ensureDirSync(DB_DIR);

        const IMGS_DB = Path.resolve(DB_DIR, "./images");

        if (!db.instance) {
            db.instance = level(IMGS_DB);
            indicateIdentity(db.instance).then((id) => {
                if (db.MAX_ID === INIT_ID) {
                    db.MAX_ID = id;
                }
            });
        }
    }

    get(id, thumbnail = false) {
        // if thumbnail, means need to resize
        /**sharp(inputBuffer)
          .resize(thumbnail)
          .embed()
          .toBuffer(function(err, outputBuffer) {
            if (err) {
              throw err;
            }
            // outputBuffer contains WebP image data of a 200 pixels wide and 300 pixels high
            // containing a scaled version, embedded on a transparent canvas, of input.gif
          }); */
    }

    put(img/*{id,width,height,type,data}*/) {
        const imgId = img.id ?
            Promise.resolve(img.id) :
            db.nextIdentity().then((identity) => {
                img.id = db.generateImageId(identity);
                return img.id;
            });

        return imgId.then((id) => {
            const data = JSON.stringify({ ...img });
            return db.instance.put(id, data).then(() => img);
        });
    }
}

module.exports = ImageService;