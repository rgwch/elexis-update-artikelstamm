import "dotenv/config";
import { Parser } from "./parser";
import { Importer } from "./importer"
import type { Preparation, Product } from "./types";
import unzip from 'unzipper'
import fs from "fs/promises";
import { existsSync, createWriteStream, createReadStream } from "fs";
import path from "path";
const parser = new Parser()
const SWISSMEDIC_URL = "https://www.xn--spezialittenliste-yqb.ch/File.axd?file=XMLPublications.zip"
const logfile = path.join(__dirname, "../data/import.log")
const log = createWriteStream(logfile)

download().then(() => loadData()).then(() => console.log("done")).catch(err => { console.error(err); process.exit(1) });

async function gettime(fname: string) {
    try {
        const stat = await fs.stat(fname)
        return stat.mtime
    } catch (e) {
        return null
    }
}
async function download(): Promise<boolean> {
    const max_age = parseInt(process.env.max_age || (1000 * 60 * 60 * 24 * 7).toString())
    const url = process.env.SWISSMEDIC_URL || SWISSMEDIC_URL
    const zipname = path.join(__dirname, "../data/XMLPublications.zip")
    const prepname = path.join(__dirname, "../data/Preparations.xml")

    let time = await gettime(zipname)
    if (time == null || (new Date().getTime() - time.getTime()) > max_age) {
        log.write("downloading " + url + " to " + zipname + "\n")
        if (url) {
            const data = await (await fetch(url)).arrayBuffer()
            const buf = Buffer.from(data)
            await fs.writeFile(zipname, buf)
        }
    } else {
        log.write("file " + zipname + " exists\n")
    }
    time = await gettime(prepname)
    if (time == null || (new Date().getTime() - time.getTime()) > max_age) {
        log.write("extracting " + zipname + " to " + prepname + "\n")
        return new Promise((resolve, reject) => {
            createReadStream(zipname)
                .pipe(unzip.Parse())
                .on('entry', async (entry) => {
                    const fileName = entry.path;
                    console.log(fileName)
                    const type = entry.type; // 'Directory' or 'File'
                    const size = entry.size;
                    if (fileName === "Preparations.xml") {
                        const content = await entry.buffer()
                        await fs.writeFile(prepname, content);
                        resolve(true)
                    } else {
                        entry.autodrain();
                    }
                });
        });
    } else {
        log.write("file " + prepname + " exists\n")
        return true
    }
}


async function loadData() {
    const importer = new Importer(log)
    /*
    console.log(path.join(__dirname, "../samples/oddb_product.xml"))
    const prdraw = await parser.parse(path.join(__dirname, "../samples/oddb_product.xml"));
    const products: Array<Product> = prdraw.PRODUCT.PRD;
    */
    /*
     console.log(path.join(__dirname, "../samples/oddb_article.xml"))
     const artraw = await parser.parse(path.join(__dirname, "../samples/oddb_article.xml"));
     const articles = artraw.ARTICLE.ART;
     console.log(articles.length)
     console.log(JSON.stringify(articles[21199], null, 2))
     */
    console.log(path.join(__dirname, "../data/Preparations.xml"))
    const prepraw = await parser.parse(path.join(__dirname, "../data/Preparations.xml"));
    const preparations: Array<Preparation> = prepraw.Preparations.Preparation;
    console.log(preparations.length)
    for (const prep of preparations) {
        await importer.process(prep)
    }
    await importer.finish()
    log.close()
    return true
}