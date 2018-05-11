const level = require("level");
const Path = require("path")
const fs = require("fs-extra");
const sharp = require("sharp");
const isArray = require("lodash/isArray");
const isObject = require("lodash/isObject");
const isString = require("lodash/isString");
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
        const timeline = `${now.getFullYear()}`;
        return `${timeline}${fixNum(identity, 8)}`;
    }
};

const resizetoThumbnail = (img) => {
    const ThumbnailSize = 120;
    return new Promise((resolve, reject) => {
        const { dataURL, width, height } = img;
        const [header] = Array.from(/^data:image\/(\w+);base64,/ig.exec(dataURL) || [""]);
        const b64string = dataURL.substr(header.length);

        // if thumbnail, means need to resize
        const inputBuffer = Buffer.from(b64string, "base64");
        const thumbnail = { width: ThumbnailSize, height: ThumbnailSize };
        if (width > height) {
            thumbnail.height = undefined;
        } else {
            thumbnail.width = undefined;
        }

        sharp(inputBuffer)
            .resize(thumbnail.width, thumbnail.height)
            .embed()
            .toBuffer((err, outputBuffer) => {
                if (err) {
                    return reject(err);
                }

                return resolve(`${header}${outputBuffer.toString("base64")}`);
            });
    });
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

    pics(progress) {
        if (!isArray(progress)) {
            return Promise.resolve(progress);
        }

        const landing = (pics, pic) => {
            const index = pics.indexOf(pic);
            return db.nextIdentity().then((identity) => {
                const id = db.generateImageId(identity);
                pics[index] = id;
                return { ...pic, id };
            });
        };

        const tasks = [];
        for (let p of progress) {
            if (!isArray(p.pics)) {
                p.pics = [];
            }

            for (let i = 0; i < p.pics.length; i++) {
                let pic = p.pics[i];
                if (isObject(pic) && pic.dataURL) {
                    tasks.push(landing(p.pics, pic));
                }
            }
        }

        return Promise.all(tasks).then((imgs) => {
            const updates = imgs.map((img) => (
                {
                    type: "put",
                    key: img.id,
                    value: JSON.stringify(img),
                }
            ));

            return db.instance.batch(updates).then(() => progress);
        });
    }

    get(id, thumbnail = false) {
        return db.instance.get(id).then((data) => JSON.parse(data)).then((img) => {
            if (thumbnail) {
                return resizetoThumbnail(img);
            }

            return img.dataURL;
        });
    }

    put(img/*{id,width,height,dataURL}*/) {
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